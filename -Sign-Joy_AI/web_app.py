import json
from pathlib import Path
import os
import random
import socket
from threading import Event, Lock, Thread
from typing import Any
from urllib.parse import quote, unquote

import cv2
import mediapipe as mp
import numpy as np
import time
from flask import Flask, Response, jsonify, render_template, request, send_from_directory, stream_with_context

from web_pipeline import DATASET_ROOT, process_input_text

APP_ROOT = Path(__file__).resolve().parent

app = Flask(
    __name__,
    template_folder=str(APP_ROOT / "web" / "templates"),
    static_folder=str(APP_ROOT / "web" / "static"),
)

DATASET_ROOT_RESOLVED = DATASET_ROOT.resolve()
OVERLAY_DEFAULT_TARGET_WIDTH = 640
OVERLAY_DEFAULT_TARGET_FPS = 15
OVERLAY_DEFAULT_JPEG_QUALITY = 70
OVERLAY_DEFAULT_MODEL_COMPLEXITY = 0
OVERLAY_MIN_TARGET_WIDTH = 320
OVERLAY_MAX_TARGET_WIDTH = 1280
OVERLAY_MIN_TARGET_FPS = 5
OVERLAY_MAX_TARGET_FPS = 30
OVERLAY_MIN_JPEG_QUALITY = 30
OVERLAY_MAX_JPEG_QUALITY = 95
OVERLAY_MIN_MODEL_COMPLEXITY = 0
OVERLAY_MAX_MODEL_COMPLEXITY = 2
HUMAN_OVERLAY_STYLE = True
HUMAN_OVERLAY_SHADING = True
HUMAN_OVERLAY_HAND_DETAIL = "medium"
HUMAN_OVERLAY_FACE_DETAIL = "medium"
FINGER_CHAINS = (
    (0, 1, 2, 3, 4),
    (0, 5, 6, 7, 8),
    (0, 9, 10, 11, 12),
    (0, 13, 14, 15, 16),
    (0, 17, 18, 19, 20),
)
PALM_INDICES = (0, 5, 9, 13, 17)
POSE_JOINT_INDICES = {
    "nose": 0,
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
}
FACE_ANCHOR_INDICES = {
    "nose": 1,
    "left_eye": 33,
    "right_eye": 263,
    "mouth_left": 61,
    "mouth_right": 291,
    "upper_lip": 13,
    "lower_lip": 14,
    "chin": 152,
}
FACE_FEATURE_CHAINS = (
    (70, 63, 105, 66, 107),  # left brow
    (336, 296, 334, 293, 300),  # right brow
    (33, 160, 158, 133, 153, 144, 33),  # left eye
    (362, 385, 387, 263, 373, 380, 362),  # right eye
    (61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291),  # outer lips
    (78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308),  # inner lips
)
OVERLAY_PROGRESS_LOCK = Lock()
OVERLAY_PROGRESS: dict[str, dict[str, Any]] = {}
PRESENTATION_EVENT_LOCK = Lock()
PRESENTATION_EVENT: dict[str, Any] = {
    "revision": 0,
    "eventId": "",
    "senderId": "",
    "type": "",
    "payload": None,
    "sentAt": 0,
    "updatedAt": 0.0,
}
UNITY_UDP_HOST = os.environ.get("UNITY_UDP_HOST", "127.0.0.1").strip() or "127.0.0.1"
UNITY_UDP_PORT = int(os.environ.get("UNITY_UDP_PORT", "5054"))
UNITY_DEFAULT_TARGET_FPS = 24
UNITY_MIN_TARGET_FPS = 5
UNITY_MAX_TARGET_FPS = 30
UNITY_WEBGL_BUILD_ROOT = Path(app.static_folder) / "unity-webgl"
UNITY_WEBGL_BUILD_DIR = UNITY_WEBGL_BUILD_ROOT / "Build"
UNITY_BRIDGE_LOCK = Lock()
UNITY_BRIDGE_THREAD: Thread | None = None
UNITY_BRIDGE_STOP_EVENT: Event | None = None
UNITY_BRIDGE_STATUS: dict[str, Any] = {
    "session_id": "",
    "active": False,
    "started": False,
    "done": False,
    "stopped": False,
    "message": "Process input to send the mapped sequence to the Unity desktop avatar.",
    "clip_label": None,
    "current_index": None,
    "total_clips": 0,
    "frames_sent": 0,
    "host": UNITY_UDP_HOST,
    "port": UNITY_UDP_PORT,
    "revision": 0,
    "updated_at": 0.0,
}


def _init_overlay_progress(session_id: str, total_clips: int):
    with OVERLAY_PROGRESS_LOCK:
        OVERLAY_PROGRESS[session_id] = {
            "session_id": session_id,
            "started": False,
            "done": False,
            "current_index": None,
            "clip_label": None,
            "total_clips": total_clips,
            "revision": 0,
            "updated_at": time.time(),
        }


def _update_overlay_progress(session_id: str, **updates: Any):
    with OVERLAY_PROGRESS_LOCK:
        progress = OVERLAY_PROGRESS.get(session_id)
        if progress is None:
            return
        progress.update(updates)
        progress["revision"] = int(progress.get("revision", 0)) + 1
        progress["updated_at"] = time.time()


def _get_overlay_progress(session_id: str) -> dict[str, Any] | None:
    with OVERLAY_PROGRESS_LOCK:
        progress = OVERLAY_PROGRESS.get(session_id)
        return dict(progress) if progress is not None else None


def _update_presentation_event(payload: dict[str, Any]) -> dict[str, Any]:
    event_type = str(payload.get("type", "")).strip() or "unknown"
    event_id = str(payload.get("eventId", "")).strip() or f"presentation-{time.time_ns()}"
    sender_id = str(payload.get("senderId", "")).strip()

    try:
        sent_at = int(payload.get("sentAt", 0) or 0)
    except (TypeError, ValueError):
        sent_at = 0
    if sent_at <= 0:
        sent_at = int(time.time() * 1000)

    with PRESENTATION_EVENT_LOCK:
        revision = int(PRESENTATION_EVENT.get("revision", 0)) + 1
        PRESENTATION_EVENT.update(
            {
                "revision": revision,
                "eventId": event_id,
                "senderId": sender_id,
                "type": event_type,
                "payload": payload.get("payload"),
                "sentAt": sent_at,
                "updatedAt": time.time(),
            }
        )
        return dict(PRESENTATION_EVENT)


def _get_presentation_event() -> dict[str, Any]:
    with PRESENTATION_EVENT_LOCK:
        return dict(PRESENTATION_EVENT)


def _set_unity_bridge_status(**updates: Any) -> dict[str, Any]:
    with UNITY_BRIDGE_LOCK:
        UNITY_BRIDGE_STATUS.update(updates)
        UNITY_BRIDGE_STATUS["revision"] = int(UNITY_BRIDGE_STATUS.get("revision", 0)) + 1
        UNITY_BRIDGE_STATUS["updated_at"] = time.time()
        return dict(UNITY_BRIDGE_STATUS)


def _get_unity_bridge_status() -> dict[str, Any]:
    with UNITY_BRIDGE_LOCK:
        return dict(UNITY_BRIDGE_STATUS)


def _set_unity_bridge_runtime(thread: Thread | None, stop_event: Event | None) -> None:
    global UNITY_BRIDGE_THREAD, UNITY_BRIDGE_STOP_EVENT
    with UNITY_BRIDGE_LOCK:
        UNITY_BRIDGE_THREAD = thread
        UNITY_BRIDGE_STOP_EVENT = stop_event


def _stop_unity_bridge(wait_timeout: float = 2.0) -> dict[str, Any]:
    with UNITY_BRIDGE_LOCK:
        thread = UNITY_BRIDGE_THREAD
        stop_event = UNITY_BRIDGE_STOP_EVENT

    if stop_event is not None:
        stop_event.set()

    if thread is not None and thread.is_alive():
        thread.join(timeout=wait_timeout)

    _set_unity_bridge_runtime(None, None)
    return _set_unity_bridge_status(
        active=False,
        started=False,
        done=True,
        stopped=True,
        clip_label=None,
        current_index=None,
        message="Unity desktop playback stopped.",
    )


def _parse_clamped_int_arg(raw_value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(str(raw_value).strip())
    except (TypeError, ValueError):
        return default
    return max(minimum, min(parsed, maximum))


def _resolve_dataset_video_path(relative_path: str) -> Path | None:
    clean = unquote(relative_path or "").strip().replace("\\", "/")
    if not clean:
        return None

    candidate = (DATASET_ROOT / clean).resolve()
    try:
        candidate.relative_to(DATASET_ROOT_RESOLVED)
    except ValueError:
        return None

    if not candidate.exists() or not candidate.is_file():
        return None

    return candidate


def _parse_video_paths(raw_paths: str, deduplicate: bool = True) -> list[Path]:
    raw_items = [item.strip() for item in raw_paths.split("|") if item.strip()]
    video_paths: list[Path] = []
    seen: set[Path] = set()

    for item in raw_items:
        resolved = _resolve_dataset_video_path(item)
        if resolved is None:
            continue
        if deduplicate and resolved in seen:
            continue
        video_paths.append(resolved)
        if deduplicate:
            seen.add(resolved)

    return video_paths


def _parse_video_path_list(raw_paths: list[Any], deduplicate: bool = False) -> list[Path]:
    video_paths: list[Path] = []
    seen: set[Path] = set()

    for item in raw_paths:
        resolved = _resolve_dataset_video_path(str(item))
        if resolved is None:
            continue
        if deduplicate and resolved in seen:
            continue
        video_paths.append(resolved)
        if deduplicate:
            seen.add(resolved)

    return video_paths


MATCH_GAME_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}
MATCH_GAME_FOLDER_TOKEN_MAP = {
    "addition": ("add", "ADD", "addition"),
    "subtraction": ("subtract", "SUBTRACT", "subtraction"),
    "multiplication": ("multiply", "MULTIPLY", "multiplication"),
    "divide": ("divide", "DIVIDE", "division"),
    "equal": ("equal", "EQUAL", "equal"),
}
MATCH_GAME_STARTER_TOKENS = {"1", "2", "3", "4", "5", "add", "equal"}


def _pick_match_game_video(folder_path: Path) -> Path | None:
    if not folder_path.exists() or not folder_path.is_dir():
        return None

    files = [f for f in folder_path.iterdir() if f.suffix.lower() in MATCH_GAME_VIDEO_EXTENSIONS]
    if not files:
        return None

    files.sort(key=lambda p: (0 if p.suffix.lower() == ".mp4" else 1, p.name.lower()))
    return files[0]


def _match_game_entry_from_folder(folder_path: Path) -> dict[str, Any] | None:
    folder_name = folder_path.name.strip()
    folder_key = folder_name.lower()
    token = ""
    display_text = ""
    helper_text = ""
    category = "token"

    if ". " in folder_name:
        number_part, word_part = folder_name.split(". ", 1)
        token = number_part.strip()
        display_text = token
        helper_text = word_part.strip().title()
        category = "number"
    elif folder_key in MATCH_GAME_FOLDER_TOKEN_MAP:
        token, display_text, helper_text = MATCH_GAME_FOLDER_TOKEN_MAP[folder_key]
        category = "operator"
    else:
        return None

    video_path = _pick_match_game_video(folder_path)
    if video_path is None:
        return None

    relative = video_path.relative_to(DATASET_ROOT).as_posix()
    return {
        "token": token,
        "display_text": display_text,
        "helper_text": helper_text,
        "category": category,
        "video_relative_path": relative,
        "video_url": f"/media/{quote(relative, safe='/')}",
    }


def _build_match_game_catalog(pool: str = "starter") -> list[dict[str, Any]]:
    if not DATASET_ROOT.exists():
        return []

    entries: list[dict[str, Any]] = []
    for folder in DATASET_ROOT.iterdir():
        if not folder.is_dir():
            continue
        entry = _match_game_entry_from_folder(folder)
        if entry is None:
            continue
        entries.append(entry)

    entries.sort(key=lambda item: (item["category"], item["token"]))

    if pool == "full":
        return entries

    starter_entries = [item for item in entries if item["token"] in MATCH_GAME_STARTER_TOKENS]
    return starter_entries or entries


def _build_match_game_round(pool: str = "starter", choice_count: int = 4, exclude_token: str = "") -> dict[str, Any] | None:
    catalog = _build_match_game_catalog(pool)
    if len(catalog) < 2:
        return None

    normalized_choice_count = max(2, min(choice_count, 4, len(catalog)))
    eligible_catalog = [item for item in catalog if item["token"] != exclude_token] or catalog
    prompt = random.choice(eligible_catalog)

    distractor_pool = [item for item in catalog if item["token"] != prompt["token"]]
    if len(distractor_pool) < normalized_choice_count - 1:
        return None

    choices = random.sample(distractor_pool, normalized_choice_count - 1)
    choices.append(prompt)
    random.shuffle(choices)

    return {
        "pool": pool,
        "choice_count": normalized_choice_count,
        "correct_token": prompt["token"],
        "prompt": prompt,
        "choices": [
            {
                "token": item["token"],
                "display_text": item["display_text"],
                "helper_text": item["helper_text"],
                "category": item["category"],
                "is_correct": item["token"] == prompt["token"],
            }
            for item in choices
        ],
        "available_tokens": len(catalog),
    }


def _build_memory_cards_round(pool: str = "starter", pair_count: int = 3) -> dict[str, Any] | None:
    catalog = _build_match_game_catalog(pool)
    if len(catalog) < 2:
        return None

    normalized_pair_count = max(2, min(pair_count, 4, len(catalog)))
    chosen_pairs = random.sample(catalog, normalized_pair_count)

    return {
        "pool": pool,
        "pair_count": normalized_pair_count,
        "available_tokens": len(catalog),
        "pairs": [
            {
                "token": item["token"],
                "display_text": item["display_text"],
                "helper_text": item["helper_text"],
                "category": item["category"],
                "video_url": item["video_url"],
            }
            for item in chosen_pairs
        ],
    }


def _landmark_to_triplet(landmark) -> list[float]:
    return [round(landmark.x, 5), round(landmark.y, 5), round(landmark.z, 5)]


def _landmark_list_payload(landmarks) -> list[dict[str, float]]:
    if not landmarks:
        return []

    return [
        {
            "x": round(float(landmark.x), 5),
            "y": round(float(landmark.y), 5),
            "z": round(float(landmark.z), 5),
        }
        for landmark in landmarks.landmark
    ]


def _unity_landmark_payload(result) -> dict[str, Any]:
    return {
        "left_hand": _landmark_list_payload(result.left_hand_landmarks),
        "right_hand": _landmark_list_payload(result.right_hand_landmarks),
        "pose": _landmark_list_payload(result.pose_landmarks),
    }


def _extract_pose_payload(pose_landmarks) -> dict[str, list[float]]:
    if not pose_landmarks:
        return {}

    payload: dict[str, list[float]] = {}
    for joint_name, joint_idx in POSE_JOINT_INDICES.items():
        landmark = pose_landmarks.landmark[joint_idx]
        payload[joint_name] = [
            round(landmark.x, 5),
            round(landmark.y, 5),
            round(landmark.z, 5),
            round(float(getattr(landmark, "visibility", 1.0)), 5),
        ]

    return payload


def _extract_face_payload(face_landmarks) -> dict[str, Any]:
    if not face_landmarks:
        return {}

    anchors: dict[str, list[float]] = {}
    for name, idx in FACE_ANCHOR_INDICES.items():
        anchors[name] = _landmark_to_triplet(face_landmarks.landmark[idx])

    upper_lip = face_landmarks.landmark[FACE_ANCHOR_INDICES["upper_lip"]]
    lower_lip = face_landmarks.landmark[FACE_ANCHOR_INDICES["lower_lip"]]
    mouth_open = float(((upper_lip.x - lower_lip.x) ** 2 + (upper_lip.y - lower_lip.y) ** 2) ** 0.5)

    return {
        "anchors": anchors,
        "mouth_open": round(mouth_open, 5),
    }


def _pixel_from_norm(x_val: float, y_val: float, width: int, height: int) -> tuple[int, int]:
    max_x = max(width - 1, 0)
    max_y = max(height - 1, 0)
    px = min(max(int(x_val * width), 0), max_x)
    py = min(max(int(y_val * height), 0), max_y)
    return (px, py)


def _landmark_to_pixel(landmark, width: int, height: int) -> tuple[int, int]:
    return _pixel_from_norm(landmark.x, landmark.y, width, height)


def _extract_pose_pixels(pose_landmarks, width: int, height: int, min_visibility: float = 0.25) -> dict[str, tuple[int, int]]:
    if not pose_landmarks:
        return {}

    points: dict[str, tuple[int, int]] = {}
    for name, idx in POSE_JOINT_INDICES.items():
        landmark = pose_landmarks.landmark[idx]
        visibility = float(getattr(landmark, "visibility", 1.0))
        if visibility < min_visibility:
            continue
        points[name] = _landmark_to_pixel(landmark, width, height)

    return points


def _extract_face_anchor_pixels(face_landmarks, width: int, height: int) -> dict[str, tuple[int, int]]:
    if not face_landmarks:
        return {}

    points: dict[str, tuple[int, int]] = {}
    for name, idx in FACE_ANCHOR_INDICES.items():
        points[name] = _landmark_to_pixel(face_landmarks.landmark[idx], width, height)
    return points


def _draw_face_features(canvas: np.ndarray, face_landmarks, width: int, height: int) -> None:
    if not face_landmarks:
        return

    points = [_landmark_to_pixel(landmark, width, height) for landmark in face_landmarks.landmark]
    face_layer = np.zeros_like(canvas)
    glow_layer = np.zeros_like(canvas)

    for chain in FACE_FEATURE_CHAINS:
        chain_points = np.array([points[idx] for idx in chain], dtype=np.int32)
        cv2.polylines(face_layer, [chain_points], isClosed=False, color=(38, 52, 72), thickness=2, lineType=cv2.LINE_AA)
        cv2.polylines(glow_layer, [chain_points], isClosed=False, color=(120, 144, 170), thickness=2, lineType=cv2.LINE_AA)

    for anchor_name in FACE_ANCHOR_INDICES:
        anchor_idx = FACE_ANCHOR_INDICES[anchor_name]
        cv2.circle(face_layer, points[anchor_idx], 1, (34, 40, 50), -1, cv2.LINE_AA)

    canvas[:] = cv2.addWeighted(canvas, 1.0, glow_layer, 0.08, 0)
    canvas[:] = cv2.addWeighted(canvas, 1.0, face_layer, 0.34, 0)


def _extract_landmark_sequence(video_paths: list[Path]) -> dict[str, Any]:
    mp_holistic = mp.solutions.holistic
    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )

    frames: list[dict[str, Any]] = []

    try:
        for clip_index, video_path in enumerate(video_paths):
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue

            fps = cap.get(cv2.CAP_PROP_FPS)
            fps = fps if fps and fps > 0 else 24.0
            stride = max(1, int(round(fps / 30.0)))
            delay_ms = round((1000.0 / fps) * stride, 2)

            frame_index = 0
            while cap.isOpened():
                ok, frame = cap.read()
                if not ok:
                    break

                if frame_index % stride != 0:
                    frame_index += 1
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = holistic.process(rgb)

                frame_payload: dict[str, Any] = {
                    "clip": video_path.stem,
                    "sequence_index": clip_index,
                    "delay_ms": delay_ms,
                    "hands": {},
                    "pose": {},
                    "face": {},
                }

                if result.left_hand_landmarks:
                    frame_payload["hands"]["left"] = [
                        _landmark_to_triplet(landmark)
                        for landmark in result.left_hand_landmarks.landmark
                    ]

                if result.right_hand_landmarks:
                    frame_payload["hands"]["right"] = [
                        _landmark_to_triplet(landmark)
                        for landmark in result.right_hand_landmarks.landmark
                    ]

                pose_payload = _extract_pose_payload(result.pose_landmarks)
                if pose_payload:
                    frame_payload["pose"] = pose_payload

                face_payload = _extract_face_payload(result.face_landmarks)
                if face_payload:
                    frame_payload["face"] = face_payload

                frames.append(frame_payload)
                frame_index += 1

            cap.release()
    finally:
        holistic.close()

    return {
        "frames": frames,
        "total_frames": len(frames),
        "clips": [path.stem for path in video_paths],
    }


def _extract_unity_sequence(video_paths: list[Path]) -> dict[str, Any]:
    mp_holistic = mp.solutions.holistic
    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )

    frames: list[dict[str, Any]] = []

    try:
        for clip_index, video_path in enumerate(video_paths):
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue

            fps = cap.get(cv2.CAP_PROP_FPS)
            fps = fps if fps and fps > 0 else 24.0
            stride = max(1, int(round(fps / 30.0)))
            delay_ms = round((1000.0 / fps) * stride, 2)

            frame_index = 0
            while cap.isOpened():
                ok, frame = cap.read()
                if not ok:
                    break

                if frame_index % stride != 0:
                    frame_index += 1
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = holistic.process(rgb)
                frame_payload = _unity_landmark_payload(result)
                frame_payload["clip"] = video_path.stem
                frame_payload["sequence_index"] = clip_index
                frame_payload["delay_ms"] = delay_ms
                frames.append(frame_payload)
                frame_index += 1

            cap.release()
    finally:
        holistic.close()

    return {
        "frames": frames,
        "total_frames": len(frames),
        "clips": [path.stem for path in video_paths],
    }


def _unity_webgl_build_status() -> dict[str, Any]:
    build_dir = UNITY_WEBGL_BUILD_DIR
    if not build_dir.exists():
        return {
            "available": False,
            "message": "Unity WebGL build not found yet. Build the Unity project for WebGL first.",
        }

    loader_path = next(build_dir.glob("*.loader.js"), None)
    if loader_path is None:
        return {
            "available": False,
            "message": "Unity WebGL loader file is missing from the build output.",
        }

    build_name = loader_path.name.removesuffix(".loader.js")
    data_path = build_dir / f"{build_name}.data"
    framework_path = build_dir / f"{build_name}.framework.js"
    code_path = build_dir / f"{build_name}.wasm"

    missing_files = [
        path.name
        for path in (data_path, framework_path, code_path)
        if not path.exists()
    ]
    if missing_files:
        return {
            "available": False,
            "message": f"Unity WebGL build is incomplete. Missing: {', '.join(missing_files)}",
        }

    static_prefix = "/static/unity-webgl/Build"
    return {
        "available": True,
        "message": "Unity WebGL build is ready.",
        "build_name": build_name,
        "loader_url": f"{static_prefix}/{loader_path.name}",
        "data_url": f"{static_prefix}/{data_path.name}",
        "framework_url": f"{static_prefix}/{framework_path.name}",
        "code_url": f"{static_prefix}/{code_path.name}",
        "updated_at": max(
            loader_path.stat().st_mtime,
            data_path.stat().st_mtime,
            framework_path.stat().st_mtime,
            code_path.stat().st_mtime,
        ),
    }


def _run_unity_bridge(
    video_paths: list[Path],
    session_id: str,
    udp_host: str,
    udp_port: int,
    target_fps: int,
    model_complexity: int,
    stop_event: Event,
) -> None:
    mp_holistic = mp.solutions.holistic
    frames_sent = 0
    socket_client: socket.socket | None = None
    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=model_complexity,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )

    try:
        socket_client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        socket_client.connect((udp_host, udp_port))
        _set_unity_bridge_status(
            session_id=session_id,
            active=True,
            started=True,
            done=False,
            stopped=False,
            message=f"Streaming mapped sign sequence to Unity on {udp_host}:{udp_port}.",
            clip_label=None,
            current_index=None,
            total_clips=len(video_paths),
            frames_sent=0,
            host=udp_host,
            port=udp_port,
        )

        for clip_index, video_path in enumerate(video_paths):
            if stop_event.is_set():
                break

            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                _set_unity_bridge_status(
                    current_index=clip_index,
                    clip_label=video_path.stem,
                    message=f"Skipping unreadable clip: {video_path.stem}",
                )
                continue

            source_fps = cap.get(cv2.CAP_PROP_FPS)
            source_fps = source_fps if source_fps and source_fps > 0 else float(target_fps)
            stride = max(1, int(round(source_fps / float(target_fps)))) if target_fps > 0 else 1
            frame_delay = max((1.0 / source_fps) * stride, 1.0 / float(target_fps))
            frame_index = 0
            _set_unity_bridge_status(
                current_index=clip_index,
                clip_label=video_path.stem,
                message=f"Streaming clip {clip_index + 1} of {len(video_paths)} to Unity: {video_path.stem}",
            )

            try:
                while cap.isOpened() and not stop_event.is_set():
                    frame_started_at = time.perf_counter()
                    ok, frame = cap.read()
                    if not ok:
                        break

                    if frame_index % stride != 0:
                        frame_index += 1
                        continue

                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    result = holistic.process(rgb)
                    payload = _unity_landmark_payload(result)
                    message = f"{json.dumps(payload, separators=(',', ':'))}<EOM>"
                    socket_client.send(message.encode("utf-8"))
                    frames_sent += 1
                    _set_unity_bridge_status(frames_sent=frames_sent)

                    elapsed = time.perf_counter() - frame_started_at
                    remaining = frame_delay - elapsed
                    if remaining > 0:
                        time.sleep(remaining)

                    frame_index += 1
            finally:
                cap.release()

        if stop_event.is_set():
            _set_unity_bridge_status(
                active=False,
                done=True,
                stopped=True,
                message="Unity desktop playback stopped.",
                clip_label=None,
                current_index=None,
                frames_sent=frames_sent,
            )
        else:
            _set_unity_bridge_status(
                active=False,
                done=True,
                stopped=False,
                message="Unity desktop playback completed.",
                clip_label=None,
                current_index=None,
                frames_sent=frames_sent,
            )
    except Exception as exc:  # noqa: BLE001
        _set_unity_bridge_status(
            active=False,
            started=False,
            done=True,
            stopped=False,
            clip_label=None,
            current_index=None,
            message=f"Unity desktop playback failed: {exc}",
            frames_sent=frames_sent,
        )
    finally:
        if socket_client is not None:
            socket_client.close()
        holistic.close()
        _set_unity_bridge_runtime(None, None)


def _render_skeleton_frame(frame: np.ndarray, result, mp_bundle: dict[str, Any], _state=None) -> np.ndarray:
    mp_draw = mp_bundle["mp_draw"]
    mp_hands = mp_bundle["mp_hands"]
    mp_pose = mp_bundle["mp_pose"]
    mp_face_mesh = mp_bundle["mp_face_mesh"]

    height, width, _ = frame.shape
    canvas = np.zeros((height, width, 3), dtype=np.uint8)

    if result.pose_landmarks:
        mp_draw.draw_landmarks(
            canvas,
            result.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            mp_draw.DrawingSpec(color=(220, 228, 240), thickness=2, circle_radius=2),
            mp_draw.DrawingSpec(color=(82, 196, 255), thickness=2, circle_radius=2),
        )

    if result.face_landmarks:
        mp_draw.draw_landmarks(
            canvas,
            result.face_landmarks,
            mp_face_mesh.FACEMESH_CONTOURS,
            mp_draw.DrawingSpec(color=(160, 210, 252), thickness=1, circle_radius=1),
            mp_draw.DrawingSpec(color=(86, 142, 205), thickness=1, circle_radius=1),
        )

    hand_entries = (
        ("Left", result.left_hand_landmarks, (0, 255, 0)),
        ("Right", result.right_hand_landmarks, (255, 120, 0)),
    )
    for side, hand_landmarks, connection_color in hand_entries:
        if not hand_landmarks:
            continue

        mp_draw.draw_landmarks(
            canvas,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS,
            mp_draw.DrawingSpec(color=connection_color, thickness=2, circle_radius=3),
            mp_draw.DrawingSpec(color=(255, 255, 255), thickness=2),
        )

        for idx, landmark in enumerate(hand_landmarks.landmark):
            x_pos, y_pos = _landmark_to_pixel(landmark, width, height)
            cv2.putText(
                canvas,
                f"{side[0]}{idx}",
                (x_pos, y_pos),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.36,
                (0, 255, 255),
                1,
                cv2.LINE_AA,
            )

    pose_pixels = _extract_pose_pixels(result.pose_landmarks, width, height, min_visibility=0.2)
    for joint_name in ("left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist"):
        if joint_name not in pose_pixels:
            continue
        joint = pose_pixels[joint_name]
        cv2.circle(canvas, joint, 5, (255, 242, 182), -1, cv2.LINE_AA)
        cv2.putText(
            canvas,
            joint_name.replace("_", " "),
            (joint[0] + 6, joint[1] - 6),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.34,
            (220, 238, 255),
            1,
            cv2.LINE_AA,
        )

    return canvas


def _landmark_points(hand_landmarks, width: int, height: int) -> list[tuple[int, int]]:
    points: list[tuple[int, int]] = []
    max_x = max(width - 1, 0)
    max_y = max(height - 1, 0)

    for landmark in hand_landmarks.landmark:
        x_pos = int(landmark.x * width)
        y_pos = int(landmark.y * height)
        x_pos = min(max(x_pos, 0), max_x)
        y_pos = min(max(y_pos, 0), max_y)
        points.append((x_pos, y_pos))

    return points


def _lerp_color(color_a: tuple[int, int, int], color_b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t_clamped = min(max(t, 0.0), 1.0)
    return tuple(
        int((1.0 - t_clamped) * color_a[idx] + t_clamped * color_b[idx])
        for idx in range(3)
    )


def _smooth_points(
    previous: list[tuple[int, int]] | None,
    current: list[tuple[int, int]],
    alpha: float = 0.58,
) -> list[tuple[int, int]]:
    if not previous or len(previous) != len(current):
        return current

    out: list[tuple[int, int]] = []
    for prev_point, cur_point in zip(previous, current, strict=False):
        delta_x = cur_point[0] - prev_point[0]
        delta_y = cur_point[1] - prev_point[1]
        distance = ((delta_x * delta_x) + (delta_y * delta_y)) ** 0.5
        motion_boost = min(max((distance - 8.0) / 46.0, 0.0), 1.0)
        adaptive_alpha = alpha + ((0.9 - alpha) * motion_boost)
        out.append(
            (
                int((prev_point[0] * (1.0 - adaptive_alpha)) + (cur_point[0] * adaptive_alpha)),
                int((prev_point[1] * (1.0 - adaptive_alpha)) + (cur_point[1] * adaptive_alpha)),
            )
        )
    return out


def _smooth_point(
    previous: tuple[int, int] | None,
    current: tuple[int, int],
    alpha: float = 0.62,
) -> tuple[int, int]:
    if previous is None:
        return current

    delta_x = current[0] - previous[0]
    delta_y = current[1] - previous[1]
    distance = ((delta_x * delta_x) + (delta_y * delta_y)) ** 0.5
    motion_boost = min(max((distance - 10.0) / 54.0, 0.0), 1.0)
    adaptive_alpha = alpha + ((0.9 - alpha) * motion_boost)
    return (
        int((previous[0] * (1.0 - adaptive_alpha)) + (current[0] * adaptive_alpha)),
        int((previous[1] * (1.0 - adaptive_alpha)) + (current[1] * adaptive_alpha)),
    )


def _smooth_pixel_map(
    previous: dict[str, tuple[int, int]] | None,
    current: dict[str, tuple[int, int]],
    alpha: float = 0.46,
) -> dict[str, tuple[int, int]]:
    if not previous:
        return dict(current)

    smoothed: dict[str, tuple[int, int]] = {}
    for key, value in current.items():
        smoothed[key] = _smooth_point(previous.get(key), value, alpha=alpha)
    return smoothed


def _quadratic_curve_points(
    point_a: tuple[int, int],
    point_b: tuple[int, int],
    point_c: tuple[int, int],
    segments: int = 20,
) -> list[tuple[int, int]]:
    pts: list[tuple[int, int]] = []
    safe_segments = max(segments, 2)
    for idx in range(safe_segments + 1):
        t = idx / safe_segments
        omt = 1.0 - t
        x_pos = (omt * omt * point_a[0]) + (2 * omt * t * point_b[0]) + (t * t * point_c[0])
        y_pos = (omt * omt * point_a[1]) + (2 * omt * t * point_b[1]) + (t * t * point_c[1])
        pts.append((int(x_pos), int(y_pos)))
    return pts


def _apply_opaque_layer(canvas: np.ndarray, layer: np.ndarray) -> None:
    mask = np.any(layer > 0, axis=2)
    if np.any(mask):
        canvas[mask] = layer[mask]


def _overlay_png_alpha(
    canvas: np.ndarray,
    png: np.ndarray | None,
    center: tuple[int, int],
    target_width: int | None = None,
    target_height: int | None = None,
    angle: float = 0.0,
) -> None:
    if png is None or canvas is None or canvas.ndim != 3:
        return

    image = png
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
    elif image.shape[2] == 3:
        alpha = np.full((image.shape[0], image.shape[1], 1), 255, dtype=np.uint8)
        image = np.concatenate([image, alpha], axis=2)
    elif image.shape[2] > 4:
        image = image[:, :, :4]

    src_h, src_w = image.shape[:2]
    if src_h <= 0 or src_w <= 0:
        return

    if target_width or target_height:
        if target_width and target_height:
            width_scale = float(target_width) / float(src_w)
            height_scale = float(target_height) / float(src_h)
            scale = max(1e-4, min(width_scale, height_scale))
            size = (max(1, int(round(src_w * scale))), max(1, int(round(src_h * scale))))
        elif target_width:
            scale = max(1e-4, float(target_width) / float(src_w))
            size = (max(1, int(round(src_w * scale))), max(1, int(round(src_h * scale))))
        else:
            scale = max(1e-4, float(target_height) / float(src_h))
            size = (max(1, int(round(src_w * scale))), max(1, int(round(src_h * scale))))
        image = cv2.resize(image, size, interpolation=cv2.INTER_AREA if size[0] < src_w or size[1] < src_h else cv2.INTER_LINEAR)
        src_h, src_w = image.shape[:2]

    if angle:
        rotation_center = (src_w * 0.5, src_h * 0.5)
        matrix = cv2.getRotationMatrix2D(rotation_center, angle, 1.0)
        cos_val = abs(matrix[0, 0])
        sin_val = abs(matrix[0, 1])
        new_w = int((src_h * sin_val) + (src_w * cos_val))
        new_h = int((src_h * cos_val) + (src_w * sin_val))
        matrix[0, 2] += (new_w * 0.5) - rotation_center[0]
        matrix[1, 2] += (new_h * 0.5) - rotation_center[1]
        image = cv2.warpAffine(
            image,
            matrix,
            (max(1, new_w), max(1, new_h)),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0, 0),
        )
        src_h, src_w = image.shape[:2]

    frame_h, frame_w = canvas.shape[:2]
    center_x, center_y = int(center[0]), int(center[1])
    x0 = center_x - (src_w // 2)
    y0 = center_y - (src_h // 2)
    x1 = max(0, x0)
    y1 = max(0, y0)
    x2 = min(frame_w, x0 + src_w)
    y2 = min(frame_h, y0 + src_h)
    if x1 >= x2 or y1 >= y2:
        return

    src_x1 = x1 - x0
    src_y1 = y1 - y0
    src_x2 = src_x1 + (x2 - x1)
    src_y2 = src_y1 + (y2 - y1)

    overlay = image[src_y1:src_y2, src_x1:src_x2]
    if overlay.shape[2] < 4:
        return

    alpha = overlay[:, :, 3:4].astype(np.float32) / 255.0
    if not np.any(alpha > 0):
        return

    roi = canvas[y1:y2, x1:x2].astype(np.float32)
    overlay_rgb = overlay[:, :, :3].astype(np.float32)
    blended = (overlay_rgb * alpha) + (roi * (1.0 - alpha))
    canvas[y1:y2, x1:x2] = np.clip(blended, 0, 255).astype(np.uint8)


def _draw_overlay_background(canvas: np.ndarray) -> None:
    canvas[:] = 0


def _build_upper_body(
    canvas: np.ndarray,
    pose_pixels: dict[str, tuple[int, int]] | None = None,
) -> dict[str, tuple[int, int] | int]:
    height, width, _ = canvas.shape
    center_x = width // 2
    shoulder_y = int(height * 0.34)
    shoulder_half_span = int(width * 0.18)
    left_shoulder = (center_x - shoulder_half_span, shoulder_y)
    right_shoulder = (center_x + shoulder_half_span, shoulder_y)
    left_hip = None
    right_hip = None

    if pose_pixels:
        if "left_shoulder" in pose_pixels:
            left_shoulder = pose_pixels["left_shoulder"]
        if "right_shoulder" in pose_pixels:
            right_shoulder = pose_pixels["right_shoulder"]
        left_hip = pose_pixels.get("left_hip")
        right_hip = pose_pixels.get("right_hip")

        center_samples = [left_shoulder[0], right_shoulder[0]]
        center_y_samples = [left_shoulder[1], right_shoulder[1]]
        if left_hip and right_hip:
            center_samples.extend((left_hip[0], right_hip[0]))
            center_y_samples.extend((left_hip[1], right_hip[1]))
        center_x = int(sum(center_samples) / len(center_samples))
        shoulder_y = int(sum(center_y_samples[:2]) / 2)

    shoulder_span = max(abs(right_shoulder[0] - left_shoulder[0]), int(width * 0.24))
    shoulder_span = min(shoulder_span, int(width * 0.5))
    shoulder_mid_y = int((left_shoulder[1] + right_shoulder[1]) * 0.5)
    hip_mid_y = int((left_hip[1] + right_hip[1]) * 0.5) if left_hip and right_hip else shoulder_mid_y + max(100, int(shoulder_span * 1.05))
    hip_span = abs(right_hip[0] - left_hip[0]) if left_hip and right_hip else int(shoulder_span * 0.78)
    torso_top_y = shoulder_mid_y - max(10, int(shoulder_span * 0.1))
    chest_y = shoulder_mid_y + max(34, int(shoulder_span * 0.48))
    waist_y = min(hip_mid_y, shoulder_mid_y + max(88, int(shoulder_span * 0.96)))
    hem_y = min(height - 1, max(waist_y + max(54, int(shoulder_span * 0.78)), shoulder_mid_y + max(152, int(shoulder_span * 1.72))))
    neck_width = max(16, int(shoulder_span * 0.16))
    shoulder_cap_rx = max(20, int(shoulder_span * 0.22))
    shoulder_cap_ry = max(12, int(shoulder_span * 0.11))

    skin_base = (105, 149, 192)
    skin_shadow = (72, 104, 144)
    skin_highlight = (164, 194, 220)
    feature_color = (34, 42, 52)
    hair_color = (22, 28, 36)
    hair_highlight = (52, 64, 78)
    outfit_base = (56, 60, 72)
    outfit_shadow = (32, 34, 42)
    outfit_highlight = (88, 92, 108)
    collar_color = (132, 138, 150)

    torso_layer = np.zeros_like(canvas)
    waist_half_width = max(28, int(max(shoulder_span * 0.30, hip_span * 0.22)))
    chest_half_width = max(34, int(shoulder_span * 0.46))
    torso_poly = np.array(
        [
            (center_x - neck_width, torso_top_y),
            (left_shoulder[0] - int(shoulder_span * 0.08), left_shoulder[1] + int(shoulder_span * 0.02)),
            (left_shoulder[0] - int(shoulder_span * 0.18), left_shoulder[1] + int(shoulder_span * 0.22)),
            (center_x - chest_half_width, chest_y + int(shoulder_span * 0.12)),
            (center_x - waist_half_width, waist_y + int(shoulder_span * 0.18)),
            (center_x - int(waist_half_width * 0.86), hem_y),
            (center_x + int(waist_half_width * 0.86), hem_y),
            (center_x + waist_half_width, waist_y + int(shoulder_span * 0.18)),
            (center_x + chest_half_width, chest_y + int(shoulder_span * 0.12)),
            (right_shoulder[0] + int(shoulder_span * 0.18), right_shoulder[1] + int(shoulder_span * 0.22)),
            (right_shoulder[0] + int(shoulder_span * 0.08), right_shoulder[1] + int(shoulder_span * 0.02)),
            (center_x + neck_width, torso_top_y),
        ],
        dtype=np.int32,
    )
    cv2.fillConvexPoly(torso_layer, torso_poly, outfit_base)
    cv2.ellipse(
        torso_layer,
        (center_x, chest_y),
        (max(42, int(shoulder_span * 0.44)), max(48, int(shoulder_span * 0.36))),
        0,
        0,
        360,
        _lerp_color(outfit_base, outfit_highlight, 0.14),
        -1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        torso_layer,
        (center_x, int((chest_y + hem_y) * 0.5)),
        (max(34, int(shoulder_span * 0.34)), max(52, int(shoulder_span * 0.64))),
        0,
        0,
        360,
        _lerp_color(outfit_base, outfit_shadow, 0.16),
        -1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        torso_layer,
        left_shoulder,
        (shoulder_cap_rx, shoulder_cap_ry),
        -16,
        0,
        360,
        _lerp_color(outfit_base, outfit_shadow, 0.1),
        -1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        torso_layer,
        right_shoulder,
        (shoulder_cap_rx, shoulder_cap_ry),
        16,
        0,
        360,
        _lerp_color(outfit_base, outfit_shadow, 0.1),
        -1,
        cv2.LINE_AA,
    )
    _apply_opaque_layer(canvas, torso_layer)

    torso_shade = np.zeros_like(canvas)
    cv2.ellipse(
        torso_shade,
        (center_x + int(shoulder_span * 0.16), chest_y + int(shoulder_span * 0.18)),
        (max(22, int(shoulder_span * 0.28)), max(44, int(shoulder_span * 0.56))),
        12,
        0,
        360,
        outfit_shadow,
        -1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        torso_shade,
        (center_x - int(shoulder_span * 0.12), chest_y - int(shoulder_span * 0.1)),
        (max(24, int(shoulder_span * 0.24)), max(30, int(shoulder_span * 0.24))),
        -20,
        0,
        360,
        outfit_highlight,
        -1,
        cv2.LINE_AA,
    )
    canvas[:] = cv2.addWeighted(canvas, 1.0, torso_shade, 0.24, 0)

    shadow_layer = np.zeros_like(canvas)
    cv2.ellipse(
        shadow_layer,
        (center_x, chest_y + 20),
        (shoulder_span // 2, shoulder_span // 3),
        0,
        0,
        360,
        (0, 0, 0),
        -1,
        cv2.LINE_AA,
    )
    canvas[:] = cv2.addWeighted(canvas, 1.0, shadow_layer, 0.15, 0)

    collar_layer = np.zeros_like(canvas)
    collar_poly = np.array(
        [
            (center_x - neck_width, torso_top_y + int(shoulder_span * 0.1)),
            (center_x - int(shoulder_span * 0.14), shoulder_mid_y + int(shoulder_span * 0.2)),
            (center_x, shoulder_mid_y + int(shoulder_span * 0.34)),
            (center_x + int(shoulder_span * 0.14), shoulder_mid_y + int(shoulder_span * 0.2)),
            (center_x + neck_width, torso_top_y + int(shoulder_span * 0.1)),
            (center_x, torso_top_y - int(shoulder_span * 0.02)),
        ],
        dtype=np.int32,
    )
    cv2.fillConvexPoly(collar_layer, collar_poly, collar_color)
    _apply_opaque_layer(canvas, collar_layer)

    # The head is kept slightly smaller than the earlier cartoon pass so the body reads
    # more like a human performer and less like a mascot.
    head_width = max(30, int(shoulder_span * (0.34 if HUMAN_OVERLAY_STYLE else 0.36)))
    head_height = max(40, int(head_width * 1.18))
    head_axes = (head_width, head_height)
    head_center = (center_x, shoulder_mid_y - int(shoulder_span * 0.74))
    if pose_pixels and "nose" in pose_pixels:
        nose_x, nose_y = pose_pixels["nose"]
        head_center = (
            int((head_center[0] * 0.28) + (nose_x * 0.72)),
            int((head_center[1] * 0.28) + ((nose_y - int(head_axes[1] * 0.18)) * 0.72)),
        )

    neck_top_y = head_center[1] + int(head_axes[1] * 0.82)
    neck_bottom_y = shoulder_mid_y + int(shoulder_span * 0.14)
    neck_layer = np.zeros_like(canvas)
    neck_poly = np.array(
        [
            (center_x - max(10, int(shoulder_span * 0.09)), neck_top_y),
            (center_x + max(10, int(shoulder_span * 0.09)), neck_top_y),
            (center_x + max(16, int(shoulder_span * 0.14)), neck_bottom_y),
            (center_x - max(16, int(shoulder_span * 0.14)), neck_bottom_y),
        ],
        dtype=np.int32,
    )
    cv2.fillConvexPoly(neck_layer, neck_poly, skin_base)
    cv2.ellipse(
        neck_layer,
        (center_x + int(shoulder_span * 0.04), int((neck_top_y + neck_bottom_y) * 0.5)),
        (max(8, int(shoulder_span * 0.08)), max(14, int(shoulder_span * 0.16))),
        0,
        0,
        360,
        _lerp_color(skin_base, skin_shadow, 0.18),
        -1,
        cv2.LINE_AA,
    )
    _apply_opaque_layer(canvas, neck_layer)

    head_info = {
        "left_shoulder": left_shoulder,
        "right_shoulder": right_shoulder,
        "shoulder_joint_radius": max(9, int(min(width, height) * 0.025)),
        "center_x": center_x,
        "head_center": head_center,
        "head_width": head_axes[0] * 2,
        "head_height": head_axes[1] * 2,
        "head_angle": 0.0,
    }

    face_layer = np.zeros_like(canvas)
    jaw_outline = np.array(
        [
            (head_center[0] - int(head_axes[0] * 0.60), head_center[1] - int(head_axes[1] * 0.02)),
            (head_center[0] - int(head_axes[0] * 0.50), head_center[1] + int(head_axes[1] * 0.30)),
            (head_center[0] - int(head_axes[0] * 0.24), head_center[1] + int(head_axes[1] * 0.68)),
            (head_center[0] - int(head_axes[0] * 0.06), head_center[1] + int(head_axes[1] * 0.90)),
            (head_center[0], head_center[1] + int(head_axes[1] * 0.98)),
            (head_center[0] + int(head_axes[0] * 0.06), head_center[1] + int(head_axes[1] * 0.90)),
            (head_center[0] + int(head_axes[0] * 0.24), head_center[1] + int(head_axes[1] * 0.68)),
            (head_center[0] + int(head_axes[0] * 0.50), head_center[1] + int(head_axes[1] * 0.30)),
            (head_center[0] + int(head_axes[0] * 0.60), head_center[1] - int(head_axes[1] * 0.02)),
        ],
        dtype=np.int32,
    )
    jaw_poly = np.array(
        [
            (head_center[0] - int(head_axes[0] * 0.72), head_center[1] - int(head_axes[1] * 0.08)),
            (head_center[0] - int(head_axes[0] * 0.58), head_center[1] + int(head_axes[1] * 0.56)),
            (head_center[0] - int(head_axes[0] * 0.22), head_center[1] + int(head_axes[1] * 0.92)),
            (head_center[0], head_center[1] + int(head_axes[1] * 1.06)),
            (head_center[0] + int(head_axes[0] * 0.22), head_center[1] + int(head_axes[1] * 0.92)),
            (head_center[0] + int(head_axes[0] * 0.58), head_center[1] + int(head_axes[1] * 0.56)),
            (head_center[0] + int(head_axes[0] * 0.72), head_center[1] - int(head_axes[1] * 0.08)),
        ],
        dtype=np.int32,
    )
    cv2.ellipse(face_layer, head_center, head_axes, 0, 0, 360, skin_base, -1, cv2.LINE_AA)
    cv2.fillConvexPoly(face_layer, jaw_poly, _lerp_color(skin_base, skin_shadow, 0.06))
    cv2.ellipse(
        face_layer,
        (head_center[0] - int(head_axes[0] * 0.22), head_center[1] - int(head_axes[1] * 0.22)),
        (int(head_axes[0] * 0.34), int(head_axes[1] * 0.22)),
        -18,
        0,
        360,
        skin_highlight,
        -1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        face_layer,
        (head_center[0], head_center[1] - int(head_axes[1] * 0.48)),
        (head_axes[0] + 2, int(head_axes[1] * 0.56)),
        0,
        180,
        360,
        hair_color,
        -1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        face_layer,
        (head_center[0] - int(head_axes[0] * 0.18), head_center[1] - int(head_axes[1] * 0.54)),
        (int(head_axes[0] * 0.34), int(head_axes[1] * 0.16)),
        -12,
        0,
        180,
        hair_highlight,
        4,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        face_layer,
        (head_center[0] - int(head_axes[0] * 0.94), head_center[1] + int(head_axes[1] * 0.04)),
        (int(head_axes[0] * 0.1), int(head_axes[1] * 0.18)),
        0,
        0,
        360,
        _lerp_color(skin_base, skin_shadow, 0.1),
        -1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        face_layer,
        (head_center[0] + int(head_axes[0] * 0.94), head_center[1] + int(head_axes[1] * 0.04)),
        (int(head_axes[0] * 0.1), int(head_axes[1] * 0.18)),
        0,
        0,
        360,
        _lerp_color(skin_base, skin_shadow, 0.1),
        -1,
        cv2.LINE_AA,
    )
    _apply_opaque_layer(canvas, face_layer)

    if HUMAN_OVERLAY_SHADING:
        chin_shadow = np.zeros_like(canvas)
        cv2.ellipse(
            chin_shadow,
            (head_center[0], head_center[1] + int(head_axes[1] * 0.54)),
            (max(8, int(head_axes[0] * 0.28)), max(6, int(head_axes[1] * 0.12))),
            0,
            0,
            360,
            (0, 0, 0),
            -1,
            cv2.LINE_AA,
        )
        canvas[:] = cv2.addWeighted(canvas, 1.0, chin_shadow, 0.12, 0)
    cv2.line(
        canvas,
        (center_x - int(shoulder_span * 0.18), shoulder_mid_y + int(shoulder_span * 0.08)),
        (center_x - int(shoulder_span * 0.04), neck_bottom_y),
        _lerp_color(outfit_highlight, collar_color, 0.28),
        2,
        cv2.LINE_AA,
    )
    cv2.line(
        canvas,
        (center_x + int(shoulder_span * 0.18), shoulder_mid_y + int(shoulder_span * 0.08)),
        (center_x + int(shoulder_span * 0.04), neck_bottom_y),
        _lerp_color(outfit_highlight, collar_color, 0.28),
        2,
        cv2.LINE_AA,
    )

    face_detail_scale = 1.0
    if HUMAN_OVERLAY_FACE_DETAIL == "low":
        face_detail_scale = 0.88
    elif HUMAN_OVERLAY_FACE_DETAIL == "high":
        face_detail_scale = 1.08

    eye_offset = int(head_axes[0] * 0.44)
    eye_y = head_center[1] - int(head_axes[1] * 0.1)
    eye_axes = (
        max(3, int(head_axes[0] * 0.11 * face_detail_scale)),
        max(2, int(head_axes[1] * 0.06 * face_detail_scale)),
    )
    eye_feature_color = (52, 74, 104)
    for direction in (-1, 1):
        eye_center = (head_center[0] + (direction * eye_offset), eye_y)
        cv2.ellipse(canvas, eye_center, (eye_axes[0] + 2, eye_axes[1] + 1), 0, 0, 360, (232, 238, 244), -1, cv2.LINE_AA)
        cv2.ellipse(canvas, eye_center, eye_axes, 0, 0, 360, (84, 102, 128), -1, cv2.LINE_AA)
        cv2.circle(canvas, eye_center, max(1, eye_axes[1]), (34, 46, 62), -1, cv2.LINE_AA)
        cv2.circle(canvas, (eye_center[0] - 1, eye_center[1] - 1), 1, (236, 242, 248), -1, cv2.LINE_AA)
        cv2.ellipse(
            canvas,
            (eye_center[0], eye_center[1] - 1),
            (eye_axes[0] + 1, eye_axes[1] + 1),
            0,
            196,
            338,
            eye_feature_color,
            1,
            cv2.LINE_AA,
        )
        cv2.ellipse(
            canvas,
            (eye_center[0], eye_center[1] + 1),
            (eye_axes[0] + 1, eye_axes[1]),
            0,
            20,
            160,
            _lerp_color(eye_feature_color, skin_shadow, 0.34),
            1,
            cv2.LINE_AA,
        )
    cv2.ellipse(
        canvas,
        (head_center[0], head_center[1] + int(head_axes[1] * 0.40)),
        (max(8, int(head_axes[0] * 0.24 * face_detail_scale)), max(3, int(head_axes[1] * 0.08 * face_detail_scale))),
        0,
        8,
        172,
        (90, 114, 140),
        1,
        cv2.LINE_AA,
    )
    cv2.ellipse(
        canvas,
        (head_center[0], head_center[1] + int(head_axes[1] * 0.46)),
        (max(5, int(head_axes[0] * 0.14 * face_detail_scale)), max(2, int(head_axes[1] * 0.04 * face_detail_scale))),
        0,
        12,
        168,
        (156, 174, 194),
        -1,
        cv2.LINE_AA,
    )

    shoulder_joint_radius = head_info["shoulder_joint_radius"]
    cv2.ellipse(canvas, left_shoulder, (shoulder_joint_radius + 3, shoulder_joint_radius), -18, 0, 360, feature_color, -1, cv2.LINE_AA)
    cv2.ellipse(canvas, right_shoulder, (shoulder_joint_radius + 3, shoulder_joint_radius), 18, 0, 360, feature_color, -1, cv2.LINE_AA)
    cv2.circle(canvas, left_shoulder, max(4, shoulder_joint_radius // 2), outfit_highlight, -1, cv2.LINE_AA)
    cv2.circle(canvas, right_shoulder, max(4, shoulder_joint_radius // 2), outfit_highlight, -1, cv2.LINE_AA)

    return head_info


def _compute_elbow_point(shoulder: tuple[int, int], wrist: tuple[int, int], side: str) -> tuple[int, int]:
    dx = wrist[0] - shoulder[0]
    dy = wrist[1] - shoulder[1]
    length = max((dx * dx + dy * dy) ** 0.5, 1.0)
    mid_x = 0.5 * (shoulder[0] + wrist[0])
    mid_y = 0.5 * (shoulder[1] + wrist[1])

    normal_x = -dy / length
    normal_y = dx / length
    bend = min(max(length * 0.22, 24.0), 74.0)
    bend_dir = -1 if side == "Left" else 1
    lift = int(length * (0.03 if wrist[1] > shoulder[1] else -0.04))
    return (
        int(mid_x + (normal_x * bend * bend_dir)),
        int(mid_y + (normal_y * bend * bend_dir) - lift),
    )


def _draw_tapered_segment(
    layer: np.ndarray,
    start: tuple[int, int],
    end: tuple[int, int],
    start_thickness: float,
    end_thickness: float,
    color: tuple[int, int, int],
    outline_color: tuple[int, int, int] | None = None,
    outline_boost: float = 1.12,
) -> None:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    seg_len = max((dx * dx + dy * dy) ** 0.5, 1.0)
    normal_x = -dy / seg_len
    normal_y = dx / seg_len

    start_radius = max(1.0, start_thickness * 0.5)
    end_radius = max(1.0, end_thickness * 0.5)
    start_left = (int(start[0] + (normal_x * start_radius)), int(start[1] + (normal_y * start_radius)))
    start_right = (int(start[0] - (normal_x * start_radius)), int(start[1] - (normal_y * start_radius)))
    end_left = (int(end[0] + (normal_x * end_radius)), int(end[1] + (normal_y * end_radius)))
    end_right = (int(end[0] - (normal_x * end_radius)), int(end[1] - (normal_y * end_radius)))

    if outline_color is not None:
        outline_poly = np.array(
            [
                (int(start[0] + (normal_x * start_radius * outline_boost)), int(start[1] + (normal_y * start_radius * outline_boost))),
                (int(end[0] + (normal_x * end_radius * outline_boost)), int(end[1] + (normal_y * end_radius * outline_boost))),
                (int(end[0] - (normal_x * end_radius * outline_boost)), int(end[1] - (normal_y * end_radius * outline_boost))),
                (int(start[0] - (normal_x * start_radius * outline_boost)), int(start[1] - (normal_y * start_radius * outline_boost))),
            ],
            dtype=np.int32,
        )
        cv2.fillConvexPoly(layer, outline_poly, outline_color, lineType=cv2.LINE_AA)

    body_poly = np.array([start_left, end_left, end_right, start_right], dtype=np.int32)
    cv2.fillConvexPoly(layer, body_poly, color, lineType=cv2.LINE_AA)


def _draw_connected_arm(
    canvas: np.ndarray,
    shoulder: tuple[int, int],
    wrist: tuple[int, int],
    side: str,
    strong: bool = True,
    elbow_override: tuple[int, int] | None = None,
) -> tuple[int, int]:
    elbow = elbow_override if elbow_override is not None else _compute_elbow_point(shoulder, wrist, side)
    upper_len = max(((elbow[0] - shoulder[0]) ** 2 + (elbow[1] - shoulder[1]) ** 2) ** 0.5, 1.0)
    lower_len = max(((wrist[0] - elbow[0]) ** 2 + (wrist[1] - elbow[1]) ** 2) ** 0.5, 1.0)

    if strong:
        sleeve_base = (82, 90, 104)
        sleeve_shadow = (40, 44, 54)
        sleeve_highlight = (114, 122, 138)
        skin_base = (100, 144, 188)
        skin_shadow = (68, 104, 146)
        skin_highlight = (150, 188, 220)
        outline_color = (20, 24, 30)
        detail_alpha = 0.28
        outline_alpha = 0.72
    else:
        sleeve_base = (90, 84, 74)
        sleeve_shadow = (50, 46, 40)
        sleeve_highlight = (126, 118, 108)
        skin_base = (94, 136, 176)
        skin_shadow = (62, 96, 132)
        skin_highlight = (140, 176, 206)
        outline_color = (22, 26, 32)
        detail_alpha = 0.18
        outline_alpha = 0.56

    upper_thickness = max(10, int(upper_len * (0.18 if strong else 0.13)))
    elbow_radius = max(7, int(min(upper_len, lower_len) * (0.1 if strong else 0.08)))
    lower_thickness = max(8, int(lower_len * (0.15 if strong else 0.11)))
    wrist_radius = max(5, lower_thickness // 2)

    arm_layer = np.zeros_like(canvas)
    detail_layer = np.zeros_like(canvas)

    def draw_segment(
        start: tuple[int, int],
        end: tuple[int, int],
        thickness: int,
        base_color: tuple[int, int, int],
        highlight_color: tuple[int, int, int],
        ) -> None:
        seg_dx = end[0] - start[0]
        seg_dy = end[1] - start[1]
        seg_len = max((seg_dx * seg_dx + seg_dy * seg_dy) ** 0.5, 1.0)
        normal_x = -seg_dy / seg_len
        normal_y = seg_dx / seg_len
        highlight_start = (
            int(start[0] - (normal_x * 1.4)),
            int(start[1] - (normal_y * 1.4)),
        )
        highlight_end = (
            int(end[0] - (normal_x * 1.4)),
            int(end[1] - (normal_y * 1.4)),
        )
        start_radius = max(4, thickness)
        end_radius = max(3, int(thickness * 0.74))
        _draw_tapered_segment(arm_layer, start, end, start_radius, end_radius, base_color, outline_color, 1.08)
        cv2.line(detail_layer, highlight_start, highlight_end, highlight_color, max(2, thickness // 5), cv2.LINE_AA)
    draw_segment(shoulder, elbow, upper_thickness, sleeve_base, sleeve_highlight)
    draw_segment(elbow, wrist, lower_thickness, skin_base, skin_highlight)

    cv2.circle(arm_layer, shoulder, upper_thickness // 2, _lerp_color(sleeve_base, sleeve_highlight, 0.12), -1, cv2.LINE_AA)
    cv2.circle(arm_layer, elbow, elbow_radius + 1, _lerp_color(skin_base, skin_shadow, 0.08), -1, cv2.LINE_AA)
    cv2.circle(detail_layer, elbow, max(3, elbow_radius - 1), skin_highlight, -1, cv2.LINE_AA)
    cv2.circle(arm_layer, wrist, wrist_radius, _lerp_color(skin_base, skin_highlight, 0.1), -1, cv2.LINE_AA)

    if strong:
        sleeve_cuff = (
            int((shoulder[0] * 0.28) + (elbow[0] * 0.72)),
            int((shoulder[1] * 0.28) + (elbow[1] * 0.72)),
        )
        cv2.circle(arm_layer, sleeve_cuff, max(4, upper_thickness // 4), _lerp_color(sleeve_base, sleeve_shadow, 0.16), -1, cv2.LINE_AA)

    _apply_opaque_layer(canvas, arm_layer)
    canvas[:] = cv2.addWeighted(canvas, 1.0, detail_layer, detail_alpha, 0)
    return elbow


def _draw_premium_hand(
    canvas: np.ndarray,
    points: list[tuple[int, int]],
    wrist: tuple[int, int],
    side: str,
    width: int,
    height: int,
) -> None:
    render_points = list(points)
    render_points[0] = wrist
    if not HUMAN_OVERLAY_HAND_DETAIL:
        return

    palm_seed_indices = (0, 5, 9, 13, 17)
    palm_seed = np.array([render_points[idx] for idx in palm_seed_indices], dtype=np.int32)
    palm_poly = cv2.convexHull(palm_seed)

    skin_base = (103, 145, 188) if side == "Left" else (98, 140, 184)
    skin_shadow = (70, 104, 146) if side == "Left" else (66, 98, 140)
    skin_highlight = (156, 190, 220)
    outline_color = (22, 26, 32)
    palm_shadow_color = _lerp_color(skin_shadow, outline_color, 0.28)
    knuckle_color = _lerp_color(skin_shadow, skin_highlight, 0.2)
    fingertip_color = _lerp_color(skin_base, skin_highlight, 0.45)

    fill_layer = np.zeros_like(canvas)
    detail_layer = np.zeros_like(canvas)
    shadow_layer = np.zeros_like(canvas)

    base_thickness = max(9, int(min(width, height) * 0.024))
    wrist_radius = max(7, int(base_thickness * 0.72))

    palm_points = np.array([render_points[idx] for idx in palm_seed_indices], dtype=np.float32)
    palm_center = tuple(np.mean(palm_points, axis=0).astype(int))
    palm_width_vec = np.array([
        render_points[17][0] - render_points[5][0],
        render_points[17][1] - render_points[5][1],
    ], dtype=np.float32)
    palm_length_vec = np.array([
        render_points[9][0] - render_points[0][0],
        render_points[9][1] - render_points[0][1],
    ], dtype=np.float32)
    palm_angle = float(np.degrees(np.arctan2(palm_width_vec[1], palm_width_vec[0]))) if np.linalg.norm(palm_width_vec) > 1e-4 else 0.0
    palm_width = max(base_thickness * 3, int(np.linalg.norm(palm_width_vec) * 0.78))
    palm_height = max(base_thickness * 3, int(np.linalg.norm(palm_length_vec) * 0.88))

    if HUMAN_OVERLAY_SHADING:
        cv2.ellipse(
            shadow_layer,
            (palm_center[0] + int(np.cos(np.radians(palm_angle + 18)) * 4), palm_center[1] + int(np.sin(np.radians(palm_angle + 18)) * 4)),
            (int(palm_width * 0.56), int(palm_height * 0.44)),
            palm_angle,
            0,
            360,
            palm_shadow_color,
            -1,
            cv2.LINE_AA,
        )

    cv2.ellipse(
        fill_layer,
        palm_center,
        (int(palm_width * 0.54), int(palm_height * 0.42)),
        palm_angle,
        0,
        360,
        skin_base,
        -1,
        cv2.LINE_AA,
    )
    cv2.fillConvexPoly(fill_layer, palm_poly, _lerp_color(skin_base, skin_shadow, 0.08))
    cv2.circle(fill_layer, wrist, wrist_radius, skin_base, -1, cv2.LINE_AA)

    if HUMAN_OVERLAY_SHADING:
        cv2.ellipse(
            detail_layer,
            (palm_center[0] - int(np.cos(np.radians(palm_angle)) * 2), palm_center[1] - int(np.sin(np.radians(palm_angle)) * 2)),
            (int(palm_width * 0.34), int(palm_height * 0.28)),
            palm_angle,
            0,
            360,
            skin_highlight,
            -1,
            cv2.LINE_AA,
        )
        cv2.ellipse(
            detail_layer,
            (palm_center[0] + int(np.cos(np.radians(palm_angle + 90)) * 2), palm_center[1] + int(np.sin(np.radians(palm_angle + 90)) * 2)),
            (int(palm_width * 0.28), int(palm_height * 0.20)),
            palm_angle,
            0,
            360,
            skin_shadow,
            -1,
            cv2.LINE_AA,
        )

    finger_width_scale = 1.0 if HUMAN_OVERLAY_HAND_DETAIL == "medium" else 1.12
    finger_joint_boost = 0.68 if HUMAN_OVERLAY_HAND_DETAIL == "medium" else 0.92

    for chain_idx, chain in enumerate(FINGER_CHAINS):
        is_thumb = chain_idx == 0
        base_t = base_thickness * (1.06 if is_thumb else 0.96) * finger_width_scale
        mid_t = base_t * (0.74 if is_thumb else 0.70)
        tip_t = base_t * (0.46 if is_thumb else 0.42)
        segment_skin = _lerp_color(skin_base, skin_highlight, min(0.14 + (chain_idx * 0.08), 0.58))

        for seg_idx in range(len(chain) - 1):
            start = render_points[chain[seg_idx]]
            end = render_points[chain[seg_idx + 1]]
            if seg_idx == 0:
                start_thickness = base_t
                end_thickness = mid_t
            elif seg_idx == 1:
                start_thickness = mid_t
                end_thickness = tip_t
            else:
                start_thickness = tip_t
                end_thickness = tip_t * 0.82
            _draw_tapered_segment(
                fill_layer,
                start,
                end,
                start_thickness,
                end_thickness,
                segment_skin,
                outline_color if HUMAN_OVERLAY_HAND_DETAIL != "low" else None,
                1.05,
            )
            if HUMAN_OVERLAY_SHADING:
                seg_dx = end[0] - start[0]
                seg_dy = end[1] - start[1]
                seg_len = max((seg_dx * seg_dx + seg_dy * seg_dy) ** 0.5, 1.0)
                normal_x = -seg_dy / seg_len
                normal_y = seg_dx / seg_len
                highlight_start = (
                    int(start[0] - (normal_x * 1.2)),
                    int(start[1] - (normal_y * 1.2)),
                )
                highlight_end = (
                    int(end[0] - (normal_x * 1.2)),
                    int(end[1] - (normal_y * 1.2)),
                )
                cv2.line(detail_layer, highlight_start, highlight_end, skin_highlight, max(1, int(base_t // 5)), cv2.LINE_AA)

        fingertip = render_points[chain[-1]]
        tip_radius = max(4, int(base_t * (0.58 if is_thumb else 0.54)))
        cv2.circle(fill_layer, fingertip, tip_radius, fingertip_color, -1, cv2.LINE_AA)
        cv2.circle(detail_layer, (fingertip[0] - 1, fingertip[1] - 1), max(1, tip_radius // 2), (240, 244, 248), -1, cv2.LINE_AA)
        if HUMAN_OVERLAY_HAND_DETAIL == "high":
            for joint_index in chain[:-1]:
                cv2.circle(detail_layer, render_points[joint_index], max(2, int(base_t * 0.18)), knuckle_color, -1, cv2.LINE_AA)
        else:
            cv2.circle(detail_layer, render_points[chain[0]], max(2, int(base_t * 0.14)), knuckle_color, -1, cv2.LINE_AA)

    fill_mask = np.any(fill_layer > 0, axis=2)
    if np.any(fill_mask):
        canvas[fill_mask] = fill_layer[fill_mask]

    if HUMAN_OVERLAY_SHADING:
        shadow_mask = np.any(shadow_layer > 0, axis=2)
        if np.any(shadow_mask):
            shadow_blend = cv2.addWeighted(canvas, 0.82, shadow_layer, 0.18, 0)
            canvas[shadow_mask] = shadow_blend[shadow_mask]

    detail_mask = np.any(detail_layer > 0, axis=2)
    if np.any(detail_mask):
        detail_blend = cv2.addWeighted(canvas, 0.84, detail_layer, 0.16, 0)
        canvas[detail_mask] = detail_blend[detail_mask]


def _render_overlay_frame(frame: np.ndarray, result, _mp_bundle: dict[str, Any], state=None) -> np.ndarray:
    if state is None:
        state = {}

    height, width, _ = frame.shape
    canvas = np.zeros((height, width, 3), dtype=np.uint8)
    _draw_overlay_background(canvas)

    body_state = state.setdefault("body", {})
    pose_pixels_raw = _extract_pose_pixels(result.pose_landmarks, width, height, min_visibility=0.22)
    previous_pose_pixels = body_state.get("pose_pixels")
    pose_pixels = pose_pixels_raw
    if pose_pixels_raw:
        pose_pixels = _smooth_pixel_map(previous_pose_pixels, pose_pixels_raw, alpha=0.42)
        body_state["missing_frames"] = 0
    elif previous_pose_pixels and body_state.get("missing_frames", 0) < 8:
        body_state["missing_frames"] = int(body_state.get("missing_frames", 0)) + 1
        pose_pixels = previous_pose_pixels
    else:
        body_state["missing_frames"] = 0
    body_state["pose_pixels"] = pose_pixels

    body = _build_upper_body(canvas, pose_pixels)
    left_shoulder = pose_pixels.get("left_shoulder", body["left_shoulder"])
    right_shoulder = pose_pixels.get("right_shoulder", body["right_shoulder"])
    points_state = state.setdefault("points", {})
    elbow_state = state.setdefault("elbows", {})

    tracked_sides: set[str] = set()
    pose_elbows = {
        "Left": pose_pixels.get("left_elbow"),
        "Right": pose_pixels.get("right_elbow"),
    }
    pose_wrists = {
        "Left": pose_pixels.get("left_wrist"),
        "Right": pose_pixels.get("right_wrist"),
    }

    hand_sources = {
        "Left": result.left_hand_landmarks,
        "Right": result.right_hand_landmarks,
    }

    for side, hand_landmarks in hand_sources.items():
        if not hand_landmarks:
            continue

        raw_points = _landmark_points(hand_landmarks, width, height)
        if len(raw_points) < 21:
            continue

        tracked_sides.add(side)
        smoothed_points = _smooth_points(points_state.get(side), raw_points, alpha=0.64)
        points_state[side] = smoothed_points
        points = smoothed_points

        wrist = points[0]
        shoulder = left_shoulder if side == "Left" else right_shoulder
        pose_wrist = pose_wrists.get(side)
        if pose_wrist is not None:
            wrist = (
                int((wrist[0] * 0.78) + (pose_wrist[0] * 0.22)),
                int((wrist[1] * 0.78) + (pose_wrist[1] * 0.22)),
            )

        elbow_target = pose_elbows.get(side) or _compute_elbow_point(shoulder, wrist, side)
        previous_elbow = elbow_state.get(side)
        elbow = _smooth_point(previous_elbow, elbow_target, alpha=0.68)
        elbow_state[side] = elbow
        _draw_connected_arm(canvas, shoulder, wrist, side=side, strong=True, elbow_override=elbow)
        _draw_premium_hand(canvas, points, wrist, side, width, height)

    arm_rest_y = int(height * 0.64)
    if "Left" not in tracked_sides:
        points_state.pop("Left", None)
        left_pose_wrist = pose_wrists.get("Left")
        left_pose_elbow = pose_elbows.get("Left")
        if left_pose_wrist is not None:
            elbow_state["Left"] = _draw_connected_arm(
                canvas,
                left_shoulder,
                left_pose_wrist,
                side="Left",
                strong=False,
                elbow_override=left_pose_elbow,
            )
        else:
            elbow_state.pop("Left", None)
            resting_wrist_left = (left_shoulder[0] - int(width * 0.09), arm_rest_y)
            _draw_connected_arm(canvas, left_shoulder, resting_wrist_left, side="Left", strong=False)

    if "Right" not in tracked_sides:
        points_state.pop("Right", None)
        right_pose_wrist = pose_wrists.get("Right")
        right_pose_elbow = pose_elbows.get("Right")
        if right_pose_wrist is not None:
            elbow_state["Right"] = _draw_connected_arm(
                canvas,
                right_shoulder,
                right_pose_wrist,
                side="Right",
                strong=False,
                elbow_override=right_pose_elbow,
            )
        else:
            elbow_state.pop("Right", None)
            resting_wrist_right = (right_shoulder[0] + int(width * 0.09), arm_rest_y)
            _draw_connected_arm(canvas, right_shoulder, resting_wrist_right, side="Right", strong=False)

    return canvas


def _processed_frame_stream(
    video_paths: list[Path],
    frame_renderer,
    show_clip_label: bool = True,
    progress_session_id: str | None = None,
    target_width: int | None = None,
    target_fps: int | None = None,
    jpeg_quality: int = 85,
    model_complexity: int = 1,
    frame_stride: int | None = None,
    debug_label: str | None = None,
):
    mp_hands = mp.solutions.hands
    mp_pose = mp.solutions.pose
    mp_face_mesh = mp.solutions.face_mesh
    mp_holistic = mp.solutions.holistic
    mp_draw = mp.solutions.drawing_utils

    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=model_complexity,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )
    mp_bundle: dict[str, Any] = {
        "mp_hands": mp_hands,
        "mp_pose": mp_pose,
        "mp_face_mesh": mp_face_mesh,
        "mp_draw": mp_draw,
    }

    try:
        stream_started = False
        emitted_frames = 0
        stream_started_at = time.perf_counter()
        if debug_label:
            print(
                f"[{debug_label}] width={target_width or 'source'} "
                f"fps={target_fps or 'source'} quality={jpeg_quality} "
                f"complexity={model_complexity} stride={frame_stride or 'auto'}",
                flush=True,
            )
        for clip_index, video_path in enumerate(video_paths):
            render_state: dict[str, object] = {}
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue

            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_delay = (1.0 / fps) if fps and fps > 0 else 1.0 / 24.0
            desired_frame_delay = frame_delay
            effective_stride = max(1, frame_stride or 1)
            if target_fps and target_fps > 0:
                desired_frame_delay = max(frame_delay, 1.0 / float(target_fps))
                if frame_stride is None and fps and fps > 0:
                    effective_stride = max(1, int(round(float(fps) / float(target_fps))))
            clip_label = video_path.stem
            if progress_session_id:
                stream_started = True
                _update_overlay_progress(
                    progress_session_id,
                    started=True,
                    done=False,
                    current_index=clip_index,
                    clip_label=clip_label,
                )

            while cap.isOpened():
                frame_started_at = time.perf_counter()
                ok, frame = cap.read()
                if not ok:
                    break

                if target_width and target_width > 0 and frame.shape[1] > target_width:
                    scale = target_width / float(frame.shape[1])
                    resized_width = max(1, int(round(frame.shape[1] * scale)))
                    resized_height = max(1, int(round(frame.shape[0] * scale)))
                    frame = cv2.resize(
                        frame,
                        (resized_width, resized_height),
                        interpolation=cv2.INTER_AREA,
                    )

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = holistic.process(rgb)
                canvas = frame_renderer(frame, result, mp_bundle, render_state)
                if show_clip_label:
                    cv2.putText(
                        canvas,
                        f"Clip: {clip_label}",
                        (12, 28),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8,
                        (240, 240, 240),
                        2,
                        cv2.LINE_AA,
                    )

                encoded_ok, encoded = cv2.imencode(
                    ".jpg",
                    canvas,
                    [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality],
                )
                if encoded_ok:
                    emitted_frames += 1
                    if debug_label and emitted_frames % 60 == 0:
                        elapsed = time.perf_counter() - stream_started_at
                        approx_fps = (emitted_frames / elapsed) if elapsed > 0 else 0.0
                        print(
                            f"[{debug_label}] frames={emitted_frames} "
                            f"approx_fps={approx_fps:.1f}",
                            flush=True,
                        )
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + encoded.tobytes() + b"\r\n"
                    )

                processing_time = time.perf_counter() - frame_started_at
                target_delay = max(0.0, desired_frame_delay - processing_time)
                if target_delay > 0:
                    time.sleep(target_delay)

                if effective_stride > 1:
                    for _ in range(effective_stride - 1):
                        if not cap.grab():
                            break

            cap.release()
    finally:
        if progress_session_id:
            _update_overlay_progress(progress_session_id, started=stream_started, done=True)
        holistic.close()


def _skeleton_stream(video_paths: list[Path]):
    return _processed_frame_stream(video_paths, _render_skeleton_frame)


def _overlay_stream(
    video_paths: list[Path],
    progress_session_id: str | None = None,
    target_width: int = OVERLAY_DEFAULT_TARGET_WIDTH,
    target_fps: int = OVERLAY_DEFAULT_TARGET_FPS,
    jpeg_quality: int = OVERLAY_DEFAULT_JPEG_QUALITY,
    model_complexity: int = OVERLAY_DEFAULT_MODEL_COMPLEXITY,
):
    return _processed_frame_stream(
        video_paths,
        _render_overlay_frame,
        show_clip_label=False,
        progress_session_id=progress_session_id,
        target_width=target_width,
        target_fps=target_fps,
        jpeg_quality=jpeg_quality,
        model_complexity=model_complexity,
        debug_label="overlay",
    )


@app.get("/")
def index():
    if (
        request.args.get("screen") == "display"
        or request.args.get("mode") == "display"
        or request.args.get("display") == "1"
    ):
        return render_template("learn.html")
    return render_template("index.html")


@app.get("/learn")
def learn():
    return render_template("learn.html")


@app.get("/games")
def games():
    return render_template("games.html")


@app.get("/api/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "dataset_root": str(DATASET_ROOT),
            "dataset_exists": DATASET_ROOT.exists(),
        }
    )


@app.get("/api/games/match-sign/round")
def games_match_sign_round():
    pool = str(request.args.get("pool", "starter")).strip().lower() or "starter"
    if pool not in {"starter", "full"}:
        pool = "starter"

    choice_count = _parse_clamped_int_arg(request.args.get("choices", 4), 4, 2, 4)
    exclude_token = str(request.args.get("exclude", "")).strip()
    round_payload = _build_match_game_round(pool=pool, choice_count=choice_count, exclude_token=exclude_token)

    if round_payload is None:
        return jsonify({"error": "Not enough mapped sign clips are available to build a game round."}), 400

    return jsonify(round_payload)


@app.get("/api/games/memory-cards/round")
def games_memory_cards_round():
    pool = str(request.args.get("pool", "starter")).strip().lower() or "starter"
    if pool not in {"starter", "full"}:
        pool = "starter"

    pair_count = _parse_clamped_int_arg(request.args.get("pairs", 3), 3, 2, 4)
    round_payload = _build_memory_cards_round(pool=pool, pair_count=pair_count)

    if round_payload is None:
        return jsonify({"error": "Not enough mapped sign clips are available to build a memory cards round."}), 400

    return jsonify(round_payload)


@app.post("/api/process")
def process():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()

    if not text:
        return jsonify({"error": "Please provide text in the request body."}), 400

    try:
        response = process_input_text(text)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Processing failed: {exc}"}), 500

    return jsonify(response)


@app.get("/media/<path:relative_path>")
def media(relative_path: str):
    decoded = unquote(relative_path)
    return send_from_directory(DATASET_ROOT, decoded, as_attachment=False)


@app.get("/api/skeleton/stream")
def skeleton_stream():
    video_paths = _parse_video_paths(request.args.get("paths", ""))

    if not video_paths:
        return jsonify({"error": "No valid mapped video paths were provided for cartoon instructor streaming."}), 400

    response = Response(
        stream_with_context(_skeleton_stream(video_paths)),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@app.get("/api/overlay/stream")
def overlay_stream():
    video_paths = _parse_video_paths(request.args.get("paths", ""))
    session_id = str(request.args.get("session_id", "")).strip() or f"overlay-{time.time_ns()}"
    target_width = _parse_clamped_int_arg(
        request.args.get("width", OVERLAY_DEFAULT_TARGET_WIDTH),
        OVERLAY_DEFAULT_TARGET_WIDTH,
        OVERLAY_MIN_TARGET_WIDTH,
        OVERLAY_MAX_TARGET_WIDTH,
    )
    target_fps = _parse_clamped_int_arg(
        request.args.get("fps", OVERLAY_DEFAULT_TARGET_FPS),
        OVERLAY_DEFAULT_TARGET_FPS,
        OVERLAY_MIN_TARGET_FPS,
        OVERLAY_MAX_TARGET_FPS,
    )
    jpeg_quality = _parse_clamped_int_arg(
        request.args.get("quality", OVERLAY_DEFAULT_JPEG_QUALITY),
        OVERLAY_DEFAULT_JPEG_QUALITY,
        OVERLAY_MIN_JPEG_QUALITY,
        OVERLAY_MAX_JPEG_QUALITY,
    )
    model_complexity = _parse_clamped_int_arg(
        request.args.get("complexity", OVERLAY_DEFAULT_MODEL_COMPLEXITY),
        OVERLAY_DEFAULT_MODEL_COMPLEXITY,
        OVERLAY_MIN_MODEL_COMPLEXITY,
        OVERLAY_MAX_MODEL_COMPLEXITY,
    )

    if not video_paths:
        return jsonify({"error": "No valid mapped video paths were provided for overlay streaming."}), 400

    _init_overlay_progress(session_id, len(video_paths))
    response = Response(
        stream_with_context(
            _overlay_stream(
                video_paths,
                progress_session_id=session_id,
                target_width=target_width,
                target_fps=target_fps,
                jpeg_quality=jpeg_quality,
                model_complexity=model_complexity,
            )
        ),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    response.headers["X-Overlay-Session-Id"] = session_id
    return response


@app.get("/api/overlay/progress")
def overlay_progress():
    session_id = str(request.args.get("session_id", "")).strip()

    if not session_id:
        return jsonify({"error": "Overlay session id is required."}), 400

    progress = _get_overlay_progress(session_id)
    if progress is None:
        return jsonify({"error": "Overlay session not found."}), 404

    return jsonify(progress)


@app.get("/api/unity/status")
def unity_status():
    return jsonify(_get_unity_bridge_status())


@app.get("/api/unity/webgl/status")
def unity_webgl_status():
    return jsonify(_unity_webgl_build_status())


@app.get("/api/unity/sequence")
def unity_sequence():
    video_paths = _parse_video_paths(request.args.get("paths", ""), deduplicate=False)

    if not video_paths:
        return jsonify({"error": "No valid mapped video paths were provided for Unity WebGL playback."}), 400

    return jsonify(_extract_unity_sequence(video_paths))


@app.post("/api/unity/play")
def unity_play():
    payload = request.get_json(silent=True) or {}
    raw_paths = payload.get("paths", [])
    target_fps = _parse_clamped_int_arg(
        payload.get("fps", UNITY_DEFAULT_TARGET_FPS),
        UNITY_DEFAULT_TARGET_FPS,
        UNITY_MIN_TARGET_FPS,
        UNITY_MAX_TARGET_FPS,
    )
    model_complexity = _parse_clamped_int_arg(
        payload.get("complexity", 1),
        1,
        OVERLAY_MIN_MODEL_COMPLEXITY,
        OVERLAY_MAX_MODEL_COMPLEXITY,
    )
    udp_host = str(payload.get("host", UNITY_UDP_HOST)).strip() or UNITY_UDP_HOST

    try:
        udp_port = int(payload.get("port", UNITY_UDP_PORT))
    except (TypeError, ValueError):
        udp_port = UNITY_UDP_PORT

    if not isinstance(raw_paths, list):
        return jsonify({"error": "Unity playback requires a list of mapped relative video paths."}), 400

    video_paths = _parse_video_path_list(raw_paths, deduplicate=False)
    if not video_paths:
        return jsonify({"error": "No valid mapped video paths were provided for Unity playback."}), 400

    _stop_unity_bridge(wait_timeout=1.5)
    session_id = str(payload.get("session_id", "")).strip() or f"unity-{time.time_ns()}"
    stop_event = Event()
    thread = Thread(
        target=_run_unity_bridge,
        args=(video_paths, session_id, udp_host, udp_port, target_fps, model_complexity, stop_event),
        daemon=True,
    )
    _set_unity_bridge_runtime(thread, stop_event)
    _set_unity_bridge_status(
        session_id=session_id,
        active=True,
        started=False,
        done=False,
        stopped=False,
        message=f"Starting Unity desktop playback on {udp_host}:{udp_port}...",
        clip_label=None,
        current_index=None,
        total_clips=len(video_paths),
        frames_sent=0,
        host=udp_host,
        port=udp_port,
    )
    thread.start()
    return jsonify(_get_unity_bridge_status())


@app.post("/api/unity/stop")
def unity_stop():
    return jsonify(_stop_unity_bridge(wait_timeout=1.5))


@app.get("/api/presentation/event")
def presentation_event():
    raw_revision = str(request.args.get("revision", "")).strip()
    try:
        requested_revision = int(raw_revision) if raw_revision else 0
    except ValueError:
        requested_revision = 0

    event = _get_presentation_event()
    current_revision = int(event.get("revision", 0) or 0)

    if not event.get("eventId") or current_revision <= requested_revision:
        return ("", 204)

    return jsonify(event)


@app.post("/api/presentation/event")
def publish_presentation_event():
    payload = request.get_json(silent=True) or {}
    event_type = str(payload.get("type", "")).strip()

    if not event_type:
        return jsonify({"error": "Presentation event type is required."}), 400

    return jsonify(_update_presentation_event(payload))


@app.get("/api/landmarks/sequence")
@app.get("/api/landmark/sequence")
@app.get("/api/gesture3d/sequence")
def landmark_sequence():
    video_paths = _parse_video_paths(request.args.get("paths", ""), deduplicate=False)

    if not video_paths:
        return jsonify({"error": "No valid mapped video paths were provided for 3D landmark sequence."}), 400

    return jsonify(_extract_landmark_sequence(video_paths))


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.environ.get("WEB_APP_PORT", "5001")),
        debug=True,
    )

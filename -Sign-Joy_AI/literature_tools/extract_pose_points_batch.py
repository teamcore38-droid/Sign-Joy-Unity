from pathlib import Path
import json
import cv2
import mediapipe as mp

# =========================================================
# SETTINGS
# =========================================================

BASE_DATASETS_DIR = Path(r"C:\Project\datasets")
DATASET_FOLDER_NAME = "Dataset - Original"

# Output folder for JSON files
OUTPUT_JSON_DIR = Path(r"C:\Users\HP\Desktop\FYP\LITERATURE_MODEL\json_outputs")

# Keep every 5th frame
FRAME_STEP = 5

# Supported video extensions
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".mpeg", ".mpg", ".MOV", ".MP4"}

# =========================================================
# OPTIONAL FILTERS
# Change these if you want to test only one word first
# Example:
# FILTER_ARCHIVE = "archive - L"
# FILTER_CATEGORY = "Adjectives"
# FILTER_WORD = "Fat"
# MAX_VIDEOS = 1
# =========================================================

FILTER_ARCHIVE = None
FILTER_CATEGORY = None
FILTER_WORD = None
MAX_VIDEOS = None

# =========================================================
# MEDIAPIPE POSE
# =========================================================

mp_pose = mp.solutions.pose


def get_point_name(point_id: int) -> str:
    try:
        return mp_pose.PoseLandmark(point_id).name
    except Exception:
        return f"POINT_{point_id}"


def sanitize_name(name: str) -> str:
    # Make folder/file names safer
    bad_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    for ch in bad_chars:
        name = name.replace(ch, "_")
    return name.strip()


def find_dataset_roots(base_dir: Path, dataset_folder_name: str):
    if not base_dir.exists():
        raise FileNotFoundError(f"Base datasets folder not found: {base_dir}")

    roots = []
    for archive_dir in sorted(base_dir.iterdir()):
        if archive_dir.is_dir():
            if FILTER_ARCHIVE and archive_dir.name != FILTER_ARCHIVE:
                continue

            candidate = archive_dir / dataset_folder_name
            if candidate.exists() and candidate.is_dir():
                roots.append(candidate)

    return roots


def get_labels(root: Path, video_path: Path):
    """
    Expected structure:
    root / category / word / video
    Example:
    C:\Project\datasets\archive - L\Dataset - Original\Adjectives\Fat\Fat_001.mp4
    """
    rel = video_path.relative_to(root)
    parts = rel.parts

    archive_folder = root.parent.name
    dataset_folder = root.name

    category_name = ""
    word_label = ""

    if len(parts) >= 3:
        category_name = parts[0]
        word_label = parts[1]
    elif len(parts) == 2:
        category_name = parts[0]
        word_label = parts[0]
    elif len(parts) == 1:
        word_label = video_path.stem

    relative_parent = str(rel.parent)
    return archive_folder, dataset_folder, category_name, word_label, relative_parent


def collect_videos(dataset_roots):
    videos = []

    for root in dataset_roots:
        for path in root.rglob("*"):
            if path.is_file() and path.suffix.lower() in {ext.lower() for ext in VIDEO_EXTENSIONS}:
                archive_folder, dataset_folder, category_name, word_label, relative_parent = get_labels(root, path)

                if FILTER_CATEGORY and category_name != FILTER_CATEGORY:
                    continue

                if FILTER_WORD and word_label != FILTER_WORD:
                    continue

                videos.append((root, path))

    videos = sorted(videos, key=lambda x: str(x[1]).lower())

    if MAX_VIDEOS is not None:
        videos = videos[:MAX_VIDEOS]

    return videos


def process_video_to_json(root: Path, video_path: Path, pose):
    archive_folder, dataset_folder, category_name, word_label, relative_parent = get_labels(root, video_path)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[FAIL] Could not open video: {video_path}")
        return None, {
            "selected_frames": 0,
            "detected_frames": 0,
            "json_written": False
        }

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_idx = 0
    selected_frames = 0
    detected_frames = 0

    frames_data = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % FRAME_STEP != 0:
            frame_idx += 1
            continue

        selected_frames += 1

        h, w = frame.shape[:2]
        time_sec = round(frame_idx / fps, 3) if fps and fps > 0 else None

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        if results.pose_landmarks:
            detected_frames += 1
            landmarks = results.pose_landmarks.landmark

            points = []
            for point_id, lm in enumerate(landmarks):
                pixel_x = int(lm.x * w)
                pixel_y = int(lm.y * h)

                points.append({
                    "point_id": point_id,
                    "point_name": get_point_name(point_id),
                    "x": float(lm.x),
                    "y": float(lm.y),
                    "z": float(lm.z),
                    "visibility": float(lm.visibility),
                    "coordinate_xyz": [float(lm.x), float(lm.y), float(lm.z)],
                    "pixel_x": pixel_x,
                    "pixel_y": pixel_y,
                    "pixel_xy": [pixel_x, pixel_y]
                })

            frames_data.append({
                "frame_number": frame_idx,
                "time_sec": time_sec,
                "points": points
            })

        frame_idx += 1

    cap.release()

    output_data = {
        "archive_folder": archive_folder,
        "dataset_folder": dataset_folder,
        "category_name": category_name,
        "word_label": word_label,
        "relative_parent": relative_parent,
        "video_name": video_path.name,
        "video_path": str(video_path),
        "frame_step": FRAME_STEP,
        "total_selected_frames": selected_frames,
        "detected_frames": detected_frames,
        "frames": frames_data
    }

    return output_data, {
        "selected_frames": selected_frames,
        "detected_frames": detected_frames,
        "json_written": True
    }


def save_json(output_data):
    archive_folder = sanitize_name(output_data["archive_folder"])
    category_name = sanitize_name(output_data["category_name"] or "unknown_category")
    word_label = sanitize_name(output_data["word_label"] or "unknown_word")
    video_stem = sanitize_name(Path(output_data["video_name"]).stem)

    out_dir = OUTPUT_JSON_DIR / archive_folder / category_name / word_label
    out_dir.mkdir(parents=True, exist_ok=True)

    out_file = out_dir / f"{video_stem}.json"

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    return out_file


def main():
    dataset_roots = find_dataset_roots(BASE_DATASETS_DIR, DATASET_FOLDER_NAME)

    if not dataset_roots:
        raise FileNotFoundError(
            f"No '{DATASET_FOLDER_NAME}' folders found inside: {BASE_DATASETS_DIR}"
        )

    print("[INFO] Dataset roots found:")
    for root in dataset_roots:
        print("   ", root)

    videos = collect_videos(dataset_roots)

    if not videos:
        raise FileNotFoundError("No video files found matching the current filters.")

    print(f"\n[INFO] Total videos found: {len(videos)}")

    if FILTER_ARCHIVE or FILTER_CATEGORY or FILTER_WORD or MAX_VIDEOS is not None:
        print("[INFO] Filters in use:")
        print("   FILTER_ARCHIVE =", FILTER_ARCHIVE)
        print("   FILTER_CATEGORY =", FILTER_CATEGORY)
        print("   FILTER_WORD =", FILTER_WORD)
        print("   MAX_VIDEOS =", MAX_VIDEOS)

    OUTPUT_JSON_DIR.mkdir(parents=True, exist_ok=True)

    total_selected_frames = 0
    total_detected_frames = 0
    total_json_files = 0

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as pose:

        for idx, (root, video_path) in enumerate(videos, start=1):
            print(f"\n[{idx}/{len(videos)}] Processing: {video_path}")

            output_data, stats = process_video_to_json(root, video_path, pose)

            total_selected_frames += stats["selected_frames"]
            total_detected_frames += stats["detected_frames"]

            print(f"    Selected every {FRAME_STEP}th frame: {stats['selected_frames']}")
            print(f"    Pose detected frames: {stats['detected_frames']}")

            if output_data is None:
                print("    [WARN] JSON not created for this video")
                continue

            if stats["detected_frames"] == 0:
                print("    [WARN] No pose detected, JSON will contain empty frames list")

            out_file = save_json(output_data)
            total_json_files += 1
            print(f"    JSON saved: {out_file}")

    print("\n[INFO] DONE")
    print(f"[INFO] Output folder: {OUTPUT_JSON_DIR}")
    print(f"[INFO] Total selected frames: {total_selected_frames}")
    print(f"[INFO] Total detected frames: {total_detected_frames}")
    print(f"[INFO] Total JSON files written: {total_json_files}")


if __name__ == "__main__":
    main()
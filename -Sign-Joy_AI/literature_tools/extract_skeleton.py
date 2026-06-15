import json
from pathlib import Path

import cv2
import numpy as np
import pandas as pd

# ===========================
# CHANGE ONLY THIS PATH
# ===========================
DATASET_ROOT = r"C:\Project\datasets"   # <-- your dataset root
# ===========================

# Output inside your LITERATURE_MODEL project
OUT_ROOT = Path("data/landmarks")

# Process both videos and images
PROCESS_VIDEOS = True
PROCESS_IMAGES = True

VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# For speed: process every Nth frame (1 = every frame)
FRAME_STRIDE = 1

# If True: x,y exported in pixels. If False: x,y are normalized 0..1 (recommended)
EXPORT_PIXELS = False


# ------------------------------------------------------------
# MediaPipe import that works across different package layouts
# ------------------------------------------------------------
def _load_mp_hands():
    # Try classic: import mediapipe as mp; mp.solutions.hands
    try:
        import mediapipe as mp
        if hasattr(mp, "solutions") and hasattr(mp.solutions, "hands"):
            return mp.solutions.hands, ("mediapipe.mp.solutions", getattr(mp, "__version__", "unknown"))
    except Exception:
        pass

    # Try alternative layout: mediapipe.python.solutions.hands
    try:
        from mediapipe.python.solutions import hands as mp_hands
        # Get version if possible
        try:
            import mediapipe as mp
            ver = getattr(mp, "__version__", "unknown")
        except Exception:
            ver = "unknown"
        return mp_hands, ("mediapipe.python.solutions", ver)
    except Exception as e:
        raise RuntimeError(
            "MediaPipe hands module not found. Install mediapipe in your venv:\n"
            "  pip install mediapipe\n"
            f"Original error: {e}"
        )


mp_hands, (MP_LAYOUT, MP_VERSION) = _load_mp_hands()


def _hand_to_vec(hand_landmarks):
    """21 landmarks * (x,y,z) => 63 floats"""
    vec = []
    for lm in hand_landmarks.landmark:
        vec.extend([lm.x, lm.y, lm.z])
    return np.array(vec, dtype=np.float32)


def _extract_from_frame(frame_bgr, hands_ctx, width, height):
    """Return (left63, right63) as float arrays."""
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    res = hands_ctx.process(rgb)

    left = np.zeros((63,), dtype=np.float32)
    right = np.zeros((63,), dtype=np.float32)

    if res.multi_hand_landmarks and res.multi_handedness:
        for lm, handed in zip(res.multi_hand_landmarks, res.multi_handedness):
            label = handed.classification[0].label  # Left / Right
            vec = _hand_to_vec(lm)

            if EXPORT_PIXELS and width > 0 and height > 0:
                v = vec.copy()
                for i in range(21):
                    v[i * 3 + 0] *= width
                    v[i * 3 + 1] *= height
                vec = v

            if label == "Left":
                left = vec
            else:
                right = vec

    return left, right


def _columns():
    cols = ["frame"]
    for h in ["L", "R"]:
        for i in range(21):
            cols += [f"{h}lm{i}_x", f"{h}lm{i}_y", f"{h}lm{i}_z"]
    return cols


COLS = _columns()


def extract_video(video_path: Path):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None, f"Cannot open video: {video_path}"

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)

    rows = []

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as hands:

        frame_idx = 0
        out_frame = 0

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if frame_idx % FRAME_STRIDE != 0:
                frame_idx += 1
                continue

            left, right = _extract_from_frame(frame, hands, width, height)
            feat = np.concatenate([left, right], axis=0)  # 126 floats

            rows.append((out_frame, *feat.tolist()))
            out_frame += 1
            frame_idx += 1

    cap.release()

    if not rows:
        return None, f"No frames extracted: {video_path}"

    df = pd.DataFrame(rows, columns=COLS)
    meta = {
        "type": "video",
        "source": str(video_path),
        "width": width,
        "height": height,
        "fps": fps,
        "frame_stride": FRAME_STRIDE,
        "export_pixels": EXPORT_PIXELS,
        "frames_extracted": int(df.shape[0]),
        "feature_dim_per_frame": 126,
        "mediapipe_version": MP_VERSION,
        "mediapipe_layout": MP_LAYOUT
    }
    return (df, meta), None


def extract_image(image_path: Path):
    img = cv2.imread(str(image_path))
    if img is None:
        return None, f"Cannot read image: {image_path}"

    height, width = img.shape[:2]
    rows = []

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as hands:

        left, right = _extract_from_frame(img, hands, width, height)
        feat = np.concatenate([left, right], axis=0)
        rows.append((0, *feat.tolist()))

    df = pd.DataFrame(rows, columns=COLS)
    meta = {
        "type": "image",
        "source": str(image_path),
        "width": width,
        "height": height,
        "export_pixels": EXPORT_PIXELS,
        "frames_extracted": 1,
        "feature_dim_per_frame": 126,
        "mediapipe_version": MP_VERSION,
        "mediapipe_layout": MP_LAYOUT
    }
    return (df, meta), None


def _safe_rel(p: Path, root: Path):
    # Keep folder structure under OUT_ROOT
    return p.relative_to(root)


def _save_outputs(rel_path: Path, stem: str, df: pd.DataFrame, meta: dict):
    out_dir = OUT_ROOT / rel_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    csv_path = out_dir / f"{stem}_hands.csv"
    json_path = out_dir / f"{stem}_meta.json"

    df.to_csv(csv_path, index=False)
    json_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    return csv_path


def main():
    root = Path(DATASET_ROOT)
    if not root.exists():
        raise SystemExit(f"❌ DATASET_ROOT not found: {root}")

    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    files = []
    if PROCESS_VIDEOS:
        files += [p for p in root.rglob("*") if p.suffix.lower() in VIDEO_EXTS]
    if PROCESS_IMAGES:
        files += [p for p in root.rglob("*") if p.suffix.lower() in IMAGE_EXTS]

    if not files:
        raise SystemExit(f"❌ No video/image files found under: {root}")

    print(f"✅ Dataset root: {root}")
    print(f"✅ Output root : {OUT_ROOT.resolve()}")
    print(f"✅ MediaPipe   : version={MP_VERSION}, layout={MP_LAYOUT}")
    print(f"✅ Found files : {len(files)}")
    print("Starting extraction...")

    ok = 0
    for i, p in enumerate(files, 1):
        rel = _safe_rel(p, root)
        stem = p.stem.replace(" ", "_")

        if p.suffix.lower() in VIDEO_EXTS:
            result, err = extract_video(p)
        else:
            result, err = extract_image(p)

        if err:
            print(f"[{i}/{len(files)}] ❌ {err}")
            continue

        df, meta = result
        csv_path = _save_outputs(rel, stem, df, meta)
        ok += 1
        print(f"[{i}/{len(files)}] ✅ Saved: {csv_path}")

    print(f"\nDone. Extracted {ok}/{len(files)} files.")
    print(f"Check outputs in: {OUT_ROOT.resolve()}")


if __name__ == "__main__":
    main()

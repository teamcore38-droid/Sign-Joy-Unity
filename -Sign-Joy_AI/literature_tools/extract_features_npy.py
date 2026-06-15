import os
os.environ["GLOG_minloglevel"] = "3"   # silence mediapipe spam

import csv, json, hashlib, time
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp

IN_MANIFEST = Path("data/manifest.csv")
OUT_DIR = Path("data/features")
META_OUT = Path("data/features_meta.json")
BAD_LOG = Path("data/bad_files.txt")

SEQ_LEN = 30                # frames per sample
MAX_SECONDS_PER_FILE = 20   # timeout per video/image
IMAGE_JITTER_STD = 0.002

VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

mp_hands = mp.solutions.hands

def safe_id(path_str: str) -> str:
    return hashlib.md5(path_str.encode("utf-8")).hexdigest()[:10]

def hand_vec(hand_landmarks):
    v = []
    for lm in hand_landmarks.landmark:
        v.extend([lm.x, lm.y, lm.z])
    return np.array(v, dtype=np.float32)  # 63

def frame_to_feat(frame_bgr, hands_ctx):
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    res = hands_ctx.process(rgb)

    left = np.zeros((63,), dtype=np.float32)
    right = np.zeros((63,), dtype=np.float32)

    if res.multi_hand_landmarks and res.multi_handedness:
        for lm, handed in zip(res.multi_hand_landmarks, res.multi_handedness):
            label = handed.classification[0].label  # Left/Right
            vec = hand_vec(lm)
            if label == "Left":
                left = vec
            else:
                right = vec

    return np.concatenate([left, right], axis=0)  # 126

def extract_video_uniform(path: Path) -> np.ndarray | None:
    start = time.time()
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return None

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if total <= 0:
        # fallback: try read first SEQ_LEN frames
        idxs = list(range(SEQ_LEN))
    else:
        idxs = np.linspace(0, total - 1, SEQ_LEN).astype(int).tolist()

    feats = []
    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as hands:
        for idx in idxs:
            if time.time() - start > MAX_SECONDS_PER_FILE:
                break
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            feats.append(frame_to_feat(frame, hands))

    cap.release()

    if not feats:
        return None

    seq = np.stack(feats, axis=0).astype(np.float32)
    # pad if fewer than SEQ_LEN
    if seq.shape[0] < SEQ_LEN:
        pad = np.repeat(seq[-1][None, :], SEQ_LEN - seq.shape[0], axis=0)
        seq = np.concatenate([seq, pad], axis=0)
    # if more (rare), downsample
    if seq.shape[0] > SEQ_LEN:
        seq = seq[:SEQ_LEN]

    return seq

def extract_image(path: Path) -> np.ndarray | None:
    start = time.time()
    img = cv2.imread(str(path))
    if img is None:
        return None

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.5
    ) as hands:
        if time.time() - start > MAX_SECONDS_PER_FILE:
            return None
        feat = frame_to_feat(img, hands)

    seq = np.repeat(feat[None, :], SEQ_LEN, axis=0).astype(np.float32)
    if IMAGE_JITTER_STD > 0:
        seq += np.random.normal(0.0, IMAGE_JITTER_STD, size=seq.shape).astype(np.float32)
    return seq

def log_bad(msg: str):
    BAD_LOG.parent.mkdir(parents=True, exist_ok=True)
    with BAD_LOG.open("a", encoding="utf-8") as f:
        f.write(msg + "\n")

def main():
    if not IN_MANIFEST.exists():
        raise SystemExit("❌ data/manifest.csv not found. Run build_manifest.py first.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with IN_MANIFEST.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    labels = sorted({row["label"] for row in rows if row["label"] != "unknown"})
    label_to_id = {lab: i for i, lab in enumerate(labels)}

    saved = 0
    skipped = 0
    existed = 0

    for i, row in enumerate(rows, 1):
        p = Path(row["path"])
        lab = row["label"]
        ext = row["ext"].lower()

        if lab == "unknown" or lab not in label_to_id:
            skipped += 1
            continue
        if not p.exists():
            skipped += 1
            continue

        out_folder = OUT_DIR / lab
        out_folder.mkdir(parents=True, exist_ok=True)
        out_path = out_folder / f"{p.stem}_{safe_id(str(p))}.npy"

        # ✅ resume: skip already extracted files
        if out_path.exists():
            existed += 1
            continue

        try:
            if ext in VIDEO_EXTS:
                seq = extract_video_uniform(p)
            elif ext in IMAGE_EXTS:
                seq = extract_image(p)
            else:
                skipped += 1
                continue
        except Exception as e:
            log_bad(f"ERROR {p} :: {e}")
            skipped += 1
            continue

        if seq is None or seq.shape != (SEQ_LEN, 126):
            log_bad(f"FAILED {p}")
            skipped += 1
            continue

        np.save(out_path, seq)
        saved += 1

        if i % 100 == 0:
            print(f"Processed {i}/{len(rows)} | saved(new)={saved} | existed={existed} | skipped={skipped}")

    meta = {
        "seq_len": SEQ_LEN,
        "feat_dim": 126,
        "labels": labels,
        "label_to_id": label_to_id,
        "saved_new": saved,
        "already_existed": existed,
        "skipped": skipped
    }
    META_OUT.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print("\n✅ Done.")
    print(f"✅ New saved: {saved}")
    print(f"✅ Already existed: {existed}")
    print(f"⚠️ Skipped: {skipped}")
    print(f"Bad files log: {BAD_LOG.resolve() if BAD_LOG.exists() else 'none'}")
    print(f"Meta file: {META_OUT.resolve()}")

if __name__ == "__main__":
    main()

    
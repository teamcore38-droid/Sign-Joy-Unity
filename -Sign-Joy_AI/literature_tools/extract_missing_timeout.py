import os
os.environ["GLOG_minloglevel"] = "3"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import csv, json, hashlib, time
from pathlib import Path
from multiprocessing import Process, Queue, freeze_support

import numpy as np
import cv2

IN_MANIFEST = Path("data/manifest.csv")
OUT_DIR = Path("data/features")
META_OUT = Path("data/features_meta.json")
BAD_LOG = Path("data/bad_files.txt")

SEQ_LEN = 30
TIMEOUT_SEC = 25  # kill file if it hangs > this

VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
EXTS = VIDEO_EXTS | IMAGE_EXTS

def safe_id(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest()[:10]

def log_bad(msg: str):
    BAD_LOG.parent.mkdir(parents=True, exist_ok=True)
    with BAD_LOG.open("a", encoding="utf-8") as f:
        f.write(msg + "\n")

def hand_features_from_frame(frame_bgr, hands_ctx):
    import mediapipe as mp
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    res = hands_ctx.process(rgb)

    left = np.zeros((63,), dtype=np.float32)
    right = np.zeros((63,), dtype=np.float32)

    if res.multi_hand_landmarks and res.multi_handedness:
        for lm, handed in zip(res.multi_hand_landmarks, res.multi_handedness):
            label = handed.classification[0].label  # Left/Right
            v = []
            for p in lm.landmark:
                v.extend([p.x, p.y, p.z])
            vec = np.array(v, dtype=np.float32)
            if label == "Left":
                left = vec
            else:
                right = vec

    return np.concatenate([left, right], axis=0)  # 126

def extract_video_uniform(path: Path) -> np.ndarray | None:
    import mediapipe as mp
    mp_hands = mp.solutions.hands

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return None

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if total <= 0:
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
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            feats.append(hand_features_from_frame(frame, hands))

    cap.release()
    if not feats:
        return None

    seq = np.stack(feats, axis=0).astype(np.float32)
    if seq.shape[0] < SEQ_LEN:
        pad = np.repeat(seq[-1][None, :], SEQ_LEN - seq.shape[0], axis=0)
        seq = np.concatenate([seq, pad], axis=0)
    if seq.shape[0] > SEQ_LEN:
        seq = seq[:SEQ_LEN]
    return seq

def extract_image(path: Path) -> np.ndarray | None:
    import mediapipe as mp
    mp_hands = mp.solutions.hands

    img = cv2.imread(str(path))
    if img is None:
        return None

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.5
    ) as hands:
        feat = hand_features_from_frame(img, hands)

    seq = np.repeat(feat[None, :], SEQ_LEN, axis=0).astype(np.float32)
    return seq

def _worker(path_str: str, label: str, ext: str, out_path_str: str, q: Queue):
    try:
        p = Path(path_str)
        out_path = Path(out_path_str)

        if ext in VIDEO_EXTS:
            seq = extract_video_uniform(p)
        elif ext in IMAGE_EXTS:
            seq = extract_image(p)
        else:
            q.put(("skip", path_str, "bad_ext"))
            return

        if seq is None or seq.shape != (SEQ_LEN, 126):
            q.put(("fail", path_str, "no_seq"))
            return

        out_path.parent.mkdir(parents=True, exist_ok=True)
        np.save(out_path, seq)
        q.put(("ok", path_str, "saved"))
    except Exception as e:
        q.put(("err", path_str, str(e)))

def run_one_with_timeout(path_str: str, label: str, ext: str, out_path: Path):
    q = Queue()
    p = Process(target=_worker, args=(path_str, label, ext, str(out_path), q))
    p.start()
    p.join(TIMEOUT_SEC)

    if p.is_alive():
        p.terminate()
        p.join()
        return ("timeout", path_str, f">{TIMEOUT_SEC}s")

    if not q.empty():
        return q.get()

    return ("fail", path_str, "no_return")

def main():
    if not IN_MANIFEST.exists():
        raise SystemExit("❌ data/manifest.csv not found")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with IN_MANIFEST.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    labels = sorted({r["label"] for r in rows if r["label"] != "unknown"})
    label_to_id = {lab: i for i, lab in enumerate(labels)}

    existed = 0
    saved_new = 0
    skipped = 0

    # Only process files that are still missing .npy
    todo = []
    for r in rows:
        lab = r["label"]
        if lab == "unknown" or lab not in label_to_id:
            continue
        p = Path(r["path"])
        ext = r["ext"].lower()
        if ext not in EXTS or not p.exists():
            continue
        out_path = OUT_DIR / lab / f"{p.stem}_{safe_id(str(p))}.npy"
        if out_path.exists():
            existed += 1
        else:
            todo.append((str(p), lab, ext, out_path))

    print(f"Missing to extract: {len(todo)}")
    print(f"Already existed: {existed}")

    for i, (path_str, lab, ext, out_path) in enumerate(todo, 1):
        status = run_one_with_timeout(path_str, lab, ext, out_path)

        if status[0] == "ok":
            saved_new += 1
        else:
            skipped += 1
            log_bad(f"{status[0].upper()} | {lab} | {path_str} | {status[2]}")

        if i % 25 == 0:
            print(f"Done {i}/{len(todo)} | saved_new={saved_new} | skipped={skipped}")

    meta = {
        "seq_len": SEQ_LEN,
        "feat_dim": 126,
        "labels": labels,
        "label_to_id": label_to_id,
        "saved_new": saved_new,
        "skipped": skipped,
        "already_existed": existed
    }
    META_OUT.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print("\n✅ Finished missing-only extraction.")
    print(f"✅ New saved: {saved_new}")
    print(f"⚠️ Skipped (bad/timeout): {skipped}")
    print(f"Bad log: {BAD_LOG.resolve() if BAD_LOG.exists() else 'none'}")
    print(f"Meta: {META_OUT.resolve()}")

if __name__ == "__main__":
    freeze_support()
    main()
import re
import json
import shutil
from pathlib import Path

import numpy as np

FEATURES_DIR = Path("data/features")
OUT_WORDS_DIR = Path("assets/skeletons/words")
OUT_MAP_PATH = Path("assets/word_map.json")

# How many candidate npy files to inspect per label to pick a good one
MAX_CANDIDATES_PER_LABEL = 8


def slug_label(name: str) -> str:
    """
    Convert label folder names into safe keys/filenames.
    Examples:
      '1. one' -> 'one'
      'ceiling fan' -> 'ceiling_fan'
      'good(hodai)' -> 'good_hodai'
      'thank you' -> 'thank_you'
    """
    s = name.strip().lower()

    # remove leading numbering like "1. " or "12 - "
    s = re.sub(r"^\s*\d+\s*[\.\-_\)]*\s*", "", s)

    # replace & with and
    s = s.replace("&", "and")

    # replace brackets with space
    s = re.sub(r"[()\[\]{}]", " ", s)

    # spaces/hyphens -> underscore
    s = re.sub(r"[\s\-]+", "_", s)

    # keep only a-z 0-9 underscore
    s = re.sub(r"[^a-z0-9_]", "", s)

    # collapse multiple underscores
    s = re.sub(r"_+", "_", s).strip("_")

    return s


def score_npy(arr: np.ndarray) -> float:
    """
    Pick a representative sample:
      - prefer non-zero movement (higher std)
      - penalize too many zeros and NaNs
    """
    a = np.asarray(arr, dtype=np.float32)
    nan_frac = float(np.isnan(a).mean())
    a = np.nan_to_num(a, nan=0.0)

    zero_frac = float((a == 0.0).mean())
    std = float(a.std())

    # higher is better
    return std - (0.50 * zero_frac) - (10.0 * nan_frac)


def choose_best_file(npy_files):
    best_path = None
    best_score = -1e9

    for p in npy_files[:MAX_CANDIDATES_PER_LABEL]:
        try:
            arr = np.load(p)
            sc = score_npy(arr)
            if sc > best_score:
                best_score = sc
                best_path = p
        except Exception:
            continue

    # fallback: if all failed, just use first
    return best_path or npy_files[0]


def main():
    if not FEATURES_DIR.exists():
        raise SystemExit(f"FEATURES_DIR not found: {FEATURES_DIR.resolve()}")

    OUT_WORDS_DIR.mkdir(parents=True, exist_ok=True)

    label_dirs = [d for d in FEATURES_DIR.iterdir() if d.is_dir()]
    if not label_dirs:
        raise SystemExit(f"No label folders found inside: {FEATURES_DIR.resolve()}")

    word_map = {}
    used_keys = set()

    print(f"Found {len(label_dirs)} label folders. Building word skeleton library...")

    for label_dir in sorted(label_dirs, key=lambda x: x.name.lower()):
        npy_files = sorted(label_dir.rglob("*.npy"))
        if not npy_files:
            continue

        key = slug_label(label_dir.name)
        if not key:
            continue

        # avoid filename collisions
        base_key = key
        k = 2
        while key in used_keys:
            key = f"{base_key}_{k}"
            k += 1
        used_keys.add(key)

        best = choose_best_file(npy_files)
        out_path = OUT_WORDS_DIR / f"{key}.npy"
        shutil.copy2(best, out_path)

        word_map[key] = {
            "label_folder": label_dir.name,
            "picked_file": str(best),
            "out_file": str(out_path),
        }

        print(f"OK  {label_dir.name}  ->  {out_path.name}")

    OUT_MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_MAP_PATH.write_text(json.dumps(word_map, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\nDONE.")
    print("Saved word skeletons to:", OUT_WORDS_DIR.resolve())
    print("Saved map to:", OUT_MAP_PATH.resolve())
    print("Total exported words:", len(word_map))


if __name__ == "__main__":
    main()
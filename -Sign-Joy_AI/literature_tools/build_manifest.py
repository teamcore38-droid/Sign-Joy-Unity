import csv, re
from pathlib import Path
from collections import Counter

# ===========================
# CHANGE THIS ONLY
# ===========================
DATASET_ROOT = r"C:\Project\datasets"
# ===========================

VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Ignore folders that are NOT labels
IGNORE_PATTERNS = [
    r"^subject\d+$",          # subject01, subject02...
    r"^archive.*$",           # archive_6 - C, archive_3 - 1...
    r"^datasets?$",           # dataset/datasets
    r"^raw$", r"^data$",
]

IGNORE_RE = [re.compile(p, re.IGNORECASE) for p in IGNORE_PATTERNS]

def is_ignored(name: str) -> bool:
    name = name.strip()
    return any(rx.match(name) for rx in IGNORE_RE)

def pick_label(p: Path, root: Path) -> str:
    """
    Pick the first folder name in the path (walking upward) that is NOT ignored.
    This prevents 'subject01' from becoming a label.
    """
    try:
        rel = p.relative_to(root)
    except Exception:
        rel = p

    # Walk up from parent folder to root
    cur = rel.parent
    while True:
        if cur == Path(".") or cur == cur.parent:
            break
        name = cur.name.strip().lower()
        if name and not is_ignored(name):
            return name
        cur = cur.parent

    return "unknown"

def main():
    root = Path(DATASET_ROOT)
    if not root.exists():
        raise SystemExit(f"❌ DATASET_ROOT not found: {root}")

    exts = {e.lower() for e in (VIDEO_EXTS | IMAGE_EXTS)}
    files = [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in exts]

    if not files:
        raise SystemExit(f"❌ No video/image files found under: {root}")

    out = Path("data/manifest.csv")
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for p in files:
        label = pick_label(p, root)
        rows.append((str(p), label, p.suffix.lower()))

    c = Counter([r[1] for r in rows])
    print(f"✅ Files found: {len(rows)}")
    print("Top 20 labels:")
    for lab, cnt in c.most_common(20):
        print(f"  {lab:20} {cnt}")

    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["path", "label", "ext"])
        w.writerows(rows)

    print(f"\n✅ Saved manifest: {out.resolve()}")

if __name__ == "__main__":
    main()

import csv, hashlib
from pathlib import Path

IN_MANIFEST = Path("data/manifest.csv")
OUT_DIR = Path("data/features")

def safe_id(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest()[:10]

def main():
    if not IN_MANIFEST.exists():
        raise SystemExit("❌ data/manifest.csv not found")

    with IN_MANIFEST.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    missing = []
    for row in rows:
        p = Path(row["path"])
        lab = row["label"]
        if lab == "unknown":
            continue
        out_path = OUT_DIR / lab / f"{p.stem}_{safe_id(str(p))}.npy"
        if not out_path.exists():
            missing.append((lab, str(p)))

    print("Missing count:", len(missing))
    print("\nFirst 20 missing files:")
    for lab, p in missing[:20]:
        print(lab, "=>", p)

if __name__ == "__main__":
    main()
import os
import re
import unicodedata

# ✅ Point this to your Literature dataset root
BASE_DATASET_PATH = r"C:\SLIIT\FYP\AI models\Model t3\datasets\Literature"

# Optional subfolders (keep only if you actually have them)
CATEGORY_SUBFOLDERS = {
    "letters": "Letters",
    "words": "Words",
    "phrases": "Phrases",
}

# Optional: map different user inputs to the same folder keyword (edit to match YOUR dataset)
ALIASES = {
    "ok": "alright",
    "okay": "alright",
    "hi": "hello",
    "hey": "hello",
    "bye": "goodbye",
    "good bye": "goodbye",
    "colour": "color",
    "ayubowan": "ayubowan",
}

_FOLDER_INDEX = None


def _norm(text: str) -> str:
    """Normalize text for matching folder names."""
    text = unicodedata.normalize("NFKC", str(text)).lower().strip()
    text = re.sub(r"[_\-]+", " ", text)         # underscores/dashes -> space
    text = re.sub(r"[^\w\s]", " ", text)        # remove punctuation
    text = re.sub(r"\s+", " ", text).strip()    # collapse spaces
    return text


def _strip_leading_prefix(s: str) -> str:
    """
    Removes leading label-like prefixes in folder names such as:
    'a. apple' -> 'apple'
    'apple a' stays 'apple a'
    '07. book' -> 'book'
    """
    s = s.strip()
    s = re.sub(r"^[a-z]\s*[\.\-:]\s*", "", s)   # leading single-letter prefix
    s = re.sub(r"^\d+\s*[\.\-:]\s*", "", s)     # leading digit prefix (only stripping, not mapping)
    return s.strip()


def _iter_dataset_roots():
    yield BASE_DATASET_PATH
    for sub in CATEGORY_SUBFOLDERS.values():
        p = os.path.join(BASE_DATASET_PATH, sub)
        if os.path.isdir(p):
            yield p


def _build_index() -> dict:
    """
    Build lookup: normalized keyword -> folder_path
    Uses folder names only (no number/operator keyword mapping).
    """
    index = {}

    for root in _iter_dataset_roots():
        if not os.path.isdir(root):
            continue

        for folder in os.listdir(root):
            folder_path = os.path.join(root, folder)
            if not os.path.isdir(folder_path):
                continue

            name_norm = _norm(folder)
            name_core = _strip_leading_prefix(name_norm)

            # Store full and stripped variants
            if name_norm not in index:
                index[name_norm] = folder_path
            if name_core and name_core not in index:
                index[name_core] = folder_path

            # Also store token-level matches for folders like "a apple"
            for tok in name_core.split():
                if tok and tok not in index:
                    index[tok] = folder_path

    return index


def map_keyword_to_media(keyword):
    """
    Maps Literature keyword (letter/word/phrase) -> dataset folder path.
    Returns None if no match.
    """
    global _FOLDER_INDEX
    if _FOLDER_INDEX is None:
        _FOLDER_INDEX = _build_index()

    key = _norm(keyword)
    key = ALIASES.get(key, key)

    # Prefer Letters folder when keyword is a single alphabet character
    if len(key) == 1 and key.isalpha():
        letters_root = os.path.join(BASE_DATASET_PATH, CATEGORY_SUBFOLDERS.get("letters", "Letters"))
        if os.path.isdir(letters_root):
            for folder in os.listdir(letters_root):
                p = os.path.join(letters_root, folder)
                if not os.path.isdir(p):
                    continue
                core = _strip_leading_prefix(_norm(folder))
                # match "a" or "a apple"
                if core == key or (core.split() and core.split()[0] == key):
                    print(f"✅ Matched letter folder: {p}")
                    return p

    # Phrase folder exact match if you have it
    phrases_root = os.path.join(BASE_DATASET_PATH, CATEGORY_SUBFOLDERS.get("phrases", "Phrases"))
    if os.path.isdir(phrases_root):
        for folder in os.listdir(phrases_root):
            p = os.path.join(phrases_root, folder)
            if not os.path.isdir(p):
                continue
            core = _strip_leading_prefix(_norm(folder))
            if core == key:
                print(f"✅ Matched phrase folder: {p}")
                return p

    # General lookup
    if key in _FOLDER_INDEX:
        print(f"✅ Matched folder: {_FOLDER_INDEX[key]}")
        return _FOLDER_INDEX[key]

    print(f"❌ No folder matched for keyword: {keyword} (normalized: {key})")
    return None
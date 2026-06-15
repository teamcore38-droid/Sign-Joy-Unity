import re
from pathlib import Path
from typing import Any
from urllib.parse import quote

from googletrans import Translator

from calculator import perform_calculation
from gesture_mapping import map_keyword_to_media
from keyword_extraction import extract_keywords

PROJECT_ROOT = Path(__file__).resolve().parent
DATASET_ROOT = PROJECT_ROOT / "datasets" / "Numbers"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}

NUMBER_WORDS = {
    "zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
    "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
}

OPERATOR_WORDS = {
    "add", "plus", "subtract", "minus", "multiply", "times", "into",
    "divide", "division", "equal",
}

KNOWN_SIGN_TOKENS = NUMBER_WORDS | OPERATOR_WORDS

TOKEN_REGEX = re.compile(r"[A-Za-z0-9]+")


def _translate_to_english(text: str) -> dict[str, Any]:
    translator = Translator()
    cleaned = text.strip()

    if not cleaned:
        return {
            "english_text": "",
            "detected_language": "unknown",
            "was_translated": False,
            "translation_error": None,
        }

    try:
        detected_language = translator.detect(cleaned).lang
    except Exception as exc:  # noqa: BLE001
        return {
            "english_text": cleaned,
            "detected_language": "unknown",
            "was_translated": False,
            "translation_error": str(exc),
        }

    if detected_language == "si":
        try:
            translated = translator.translate(cleaned, src="si", dest="en").text
            return {
                "english_text": translated,
                "detected_language": detected_language,
                "was_translated": True,
                "translation_error": None,
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "english_text": cleaned,
                "detected_language": detected_language,
                "was_translated": False,
                "translation_error": str(exc),
            }

    return {
        "english_text": cleaned,
        "detected_language": detected_language,
        "was_translated": False,
        "translation_error": None,
    }


def _tokenize(text: str) -> list[str]:
    return TOKEN_REGEX.findall(text.lower())


def _split_into_units(tokens: list[str]) -> list[dict[str, str]]:
    units: list[dict[str, str]] = []

    for token in tokens:
        if token.isdigit() or token in KNOWN_SIGN_TOKENS:
            units.append({"unit": token, "kind": "token", "source": token})
            continue

        if token.isalpha() and len(token) > 1:
            for letter in token:
                units.append({"unit": letter, "kind": "letter", "source": token})
            continue

        units.append({"unit": token, "kind": "token", "source": token})

    return units


def _to_mapping_keyword(unit: str) -> Any:
    if unit.isdigit():
        return int(unit)
    return unit.lower()


def _pick_video(folder_path: Path) -> Path | None:
    if not folder_path.exists():
        return None

    files = [f for f in folder_path.iterdir() if f.suffix.lower() in VIDEO_EXTENSIONS]
    if not files:
        return None

    files.sort(key=lambda p: (0 if p.suffix.lower() == ".mp4" else 1, p.name.lower()))
    return files[0]


def _build_media_payload(video_path: Path) -> dict[str, str]:
    relative = video_path.relative_to(DATASET_ROOT).as_posix()
    return {
        "video_file": video_path.name,
        "video_relative_path": relative,
        "video_url": f"/media/{quote(relative, safe='/')}",
    }


def _build_visual_unit(unit: str, kind: str, source: str, cache: dict[str, dict[str, Any] | None]) -> dict[str, Any]:
    key = unit.lower()

    if key not in cache:
        mapped_folder = map_keyword_to_media(_to_mapping_keyword(unit))

        if mapped_folder is None:
            cache[key] = None
        else:
            video_path = _pick_video(Path(mapped_folder))
            cache[key] = _build_media_payload(video_path) if video_path else None

    media = cache[key]

    payload: dict[str, Any] = {
        "unit": unit,
        "kind": kind,
        "source": source,
        "is_mapped": media is not None,
    }

    if media is not None:
        payload.update(media)

    return payload


def _build_teaching_sequence(keywords: dict[str, list[Any]], result: Any) -> list[str]:
    numbers = keywords.get("numbers", [])
    operators = keywords.get("operators", [])

    if len(numbers) < 2 or len(operators) < 1 or result is None:
        return []

    sequence = [str(numbers[0]), operators[0], str(numbers[1]), "equal"]

    if isinstance(result, float) and result.is_integer():
        sequence.append(str(int(result)))
    else:
        sequence.append(str(result))

    return sequence


def process_input_text(user_text: str) -> dict[str, Any]:
    if not user_text or not user_text.strip():
        raise ValueError("Input text is required.")

    translated = _translate_to_english(user_text)
    english_text = translated["english_text"]

    tokens = _tokenize(english_text)
    input_units = _split_into_units(tokens)

    keywords = extract_keywords(english_text)
    result, expression = perform_calculation(keywords, original_text=english_text)

    teaching_sequence = _build_teaching_sequence(keywords, result)

    if isinstance(result, float) and result.is_integer():
        result_for_display: Any = int(result)
    else:
        result_for_display = result

    sequence_source = teaching_sequence if teaching_sequence else [unit["unit"] for unit in input_units]
    sequence_mode = "teaching_sequence" if teaching_sequence else "token_fallback"

    media_cache: dict[str, dict[str, Any] | None] = {}

    visual_input_units = [
        _build_visual_unit(unit["unit"], unit["kind"], unit["source"], media_cache)
        for unit in input_units
    ]

    visual_sequence_units = [
        _build_visual_unit(unit, "sequence", unit, media_cache)
        for unit in sequence_source
    ]

    unmapped_units = sorted({item["unit"] for item in visual_sequence_units if not item["is_mapped"]})

    return {
        "input_text": user_text,
        "english_text": english_text,
        "detected_language": translated["detected_language"],
        "was_translated": translated["was_translated"],
        "translation_error": translated["translation_error"],
        "input_tokens": tokens,
        "input_units": visual_input_units,
        "keywords": keywords,
        "calculation": {
            "expression": expression,
            "result": result_for_display,
            "is_valid": bool(teaching_sequence),
        },
        "sequence_mode": sequence_mode,
        "teaching_sequence": teaching_sequence,
        "sequence_units": visual_sequence_units,
        "unmapped_units": unmapped_units,
    }


LITERATURE_ROOT = PROJECT_ROOT / "datasets" / "literature"
LITERATURE_VIDEOS_DIR = LITERATURE_ROOT / "videos"

_literature_media_map = None

def get_literature_media_map() -> dict[str, Path]:
    global _literature_media_map
    if _literature_media_map is None:
        _literature_media_map = {}
        if LITERATURE_VIDEOS_DIR.exists():
            for cat_dir in LITERATURE_VIDEOS_DIR.iterdir():
                if not cat_dir.is_dir():
                    continue
                
                # a_z contains direct files
                if cat_dir.name == "a_z":
                    for item in cat_dir.iterdir():
                        if item.is_file() and item.suffix.lower() in ['.mp4', '.mov']:
                            word_key = item.stem.lower()
                            if word_key not in _literature_media_map:
                                _literature_media_map[word_key] = item
                else:
                    # other categories contain word directories containing video files
                    for word_dir in cat_dir.iterdir():
                        if not word_dir.is_dir():
                            continue
                        
                        word_key = word_dir.name.lower()
                        videos = [v for v in word_dir.iterdir() if v.suffix.lower() in ['.mp4', '.mov']]
                        if videos:
                            videos.sort(key=lambda p: p.name.lower())
                            
                            # Prioritize pronoun 'i' under nouns over alphabet 'i'
                            if word_key == "i":
                                if cat_dir.name == "nouns":
                                    _literature_media_map[word_key] = videos[0]
                            else:
                                if word_key not in _literature_media_map:
                                    _literature_media_map[word_key] = videos[0]
            
            # Fallback for 'i' if nouns is missing
            if "i" not in _literature_media_map:
                for cat_dir in LITERATURE_VIDEOS_DIR.iterdir():
                    if cat_dir.name == "a_z":
                        i_file = cat_dir / "i.mp4"
                        if i_file.exists():
                            _literature_media_map["i"] = i_file
                            
    return _literature_media_map


def _match_literature_phrases(tokens: list[str], media_map: dict[str, Path]) -> list[dict[str, Any]]:
    import difflib
    from urllib.parse import quote
    matched_units = []
    i = 0
    n = len(tokens)
    word_map_keys = set(media_map.keys())
    
    while i < n:
        matched = False
        # Try matching phrases of decreasing lengths from 5 down to 1
        for length in range(min(5, n - i), 0, -1):
            phrase_tokens = tokens[i : i + length]
            phrase_key = "_".join(phrase_tokens)
            
            if phrase_key in word_map_keys:
                video_path = media_map[phrase_key]
                relative_path = f"literature/videos/{video_path.relative_to(LITERATURE_VIDEOS_DIR).as_posix()}"
                
                matched_units.append({
                    "unit": phrase_key,
                    "kind": "phrase" if length > 1 else "token",
                    "source": " ".join(phrase_tokens),
                    "is_mapped": True,
                    "video_relative_path": relative_path,
                    "video_url": f"/media/{quote(relative_path, safe='/')}",
                    "video_file": video_path.name
                })
                i += length
                matched = True
                break
        
        if not matched:
            # Fall back to single unmatched token
            unmatched_token = tokens[i]
            # Get close suggestions
            suggestions = difflib.get_close_matches(unmatched_token, list(word_map_keys), n=3, cutoff=0.5)
            matched_units.append({
                "unit": unmatched_token,
                "kind": "token",
                "source": unmatched_token,
                "is_mapped": False,
                "video_relative_path": None,
                "video_url": None,
                "video_file": None,
                "suggestions": suggestions
            })
            i += 1
            
    return matched_units


def process_input_text_literature(user_text: str) -> dict[str, Any]:
    if not user_text or not user_text.strip():
        raise ValueError("Input text is required.")

    translated = _translate_to_english(user_text)
    english_text = translated["english_text"]

    tokens = _tokenize(english_text)
    
    media_map = get_literature_media_map()
    
    matched_units = _match_literature_phrases(tokens, media_map)

    # Build the playable sequence. For every single word we FIRST emit a sign for
    # each of its letters (finger-spelling), and ONLY AFTER all the letter signs do
    # we emit the whole-word sign. This guarantees the animation plays the spelled
    # letters first and the full word sign last, instead of jumping straight to the
    # word sign. Multi-word phrases (joined with "_") are left as-is and not spelled.
    visual_units = []
    for item in matched_units:
        word = item["unit"]
        is_single_word = ("_" not in word) and word.isalpha()
        letters = [c for c in word if c.isalpha()]

        if is_single_word and len(letters) > 1:
            # Step 1: play the sign for each letter of the word, in order.
            for char in letters:
                char_key = char.lower()
                if char_key in media_map:
                    video_path = media_map[char_key]
                    relative_path = f"literature/videos/{video_path.relative_to(LITERATURE_VIDEOS_DIR).as_posix()}"
                    visual_units.append({
                        "unit": char.upper(),
                        "kind": "letter",
                        "source": word,
                        "is_mapped": True,
                        "video_relative_path": relative_path,
                        "video_url": f"/media/{quote(relative_path, safe='/')}",
                        "video_file": video_path.name
                    })
                else:
                    visual_units.append({
                        "unit": char.upper(),
                        "kind": "letter",
                        "source": word,
                        "is_mapped": False,
                        "video_relative_path": None,
                        "video_url": None,
                        "video_file": None
                    })

        # Step 2: finally, play the whole-word (or phrase) sign last.
        visual_units.append(item)
    
    unmapped_units = sorted({item["unit"] for item in visual_units if not item["is_mapped"]})
    
    # Extract suggestions for easy display
    suggestions = {
        item["unit"]: item["suggestions"] 
        for item in matched_units
        if not item["is_mapped"] and item.get("suggestions")
    }

    return {
        "input_text": user_text,
        "english_text": english_text,
        "detected_language": translated["detected_language"],
        "was_translated": translated["was_translated"],
        "translation_error": translated["translation_error"],
        "input_tokens": tokens,
        "input_units": visual_units,
        "keywords": {"numbers": [], "operators": []},
        "calculation": {
            "expression": "",
            "result": None,
            "is_valid": False,
        },
        "sequence_mode": "literature",
        "teaching_sequence": [],
        "sequence_units": visual_units,
        "unmapped_units": unmapped_units,
        "suggestions": suggestions
    }

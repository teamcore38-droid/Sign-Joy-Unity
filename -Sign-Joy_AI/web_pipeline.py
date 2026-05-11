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

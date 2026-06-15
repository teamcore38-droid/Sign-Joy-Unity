import argparse
import json
import re
from pathlib import Path
import difflib

import numpy as np


# ---------------- MIC RECORD ----------------
def record_wav(out_wav: Path, seconds: float = 4.0, sr: int = 16000, device: int | None = None):
    import sounddevice as sd
    from scipy.io.wavfile import write

    print(f"[MIC] Recording {seconds:.1f}s... Speak Sinhala now (start speaking immediately)")
    try:
        audio = sd.rec(int(seconds * sr), samplerate=sr, channels=1, dtype="float32", device=device)
        sd.wait()
    except Exception as e:
        print("\n[FAIL] Microphone recording failed.")
        print("Reason:", e)
        print("\nRun this to list devices:")
        print('  python speech_to_word_skeleton_v3.py --list-devices')
        print("Then run with a working mic device index:")
        print('  python speech_to_word_skeleton_v3.py --device 9')
        raise SystemExit(1)

    x = audio[:, 0]
    mean_abs = float(np.mean(np.abs(x)))
    max_abs = float(np.max(np.abs(x)))
    print(f"[MIC] Audio level: mean_abs={mean_abs:.6f}, max_abs={max_abs:.6f}")

    if max_abs < 0.02:
        print("[MIC][WARN] Your mic signal is almost silent. This is NOT a code issue.")
        print("Fix Windows Sound input device + input volume + mic privacy permissions.\n")

    audio_i16 = (np.clip(x, -1.0, 1.0) * 32767).astype(np.int16)
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    write(str(out_wav), sr, audio_i16)
    print(f"[MIC] Saved: {out_wav}")


# ---------------- ASR Sinhala -> Text ----------------
def transcribe_sinhala(wav_path: Path, model_size: str = "small") -> str:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(wav_path), language="si", vad_filter=True)

    text = " ".join([seg.text.strip() for seg in segments]).strip()
    text = re.sub(r"\s+", " ", text)
    return text


# ---------------- Translate Sinhala -> English ----------------
def translate_si_to_en(text_si: str) -> str:
    if not text_si.strip():
        return ""
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="si", target="en").translate(text_si) or ""
    except Exception as e:
        print("[WARN] Translation failed:", e)
        return ""


# ---------------- Normalize + Map ----------------
def normalize_key(s: str) -> str:
    s = s.lower().strip()
    s = s.replace("&", "and")
    s = re.sub(r"[()\[\]{}]", " ", s)
    s = re.sub(r"[^a-z0-9\s\-]", "", s)
    s = re.sub(r"[\s\-]+", "_", s).strip("_")
    s = re.sub(r"_+", "_", s)
    return s


def load_word_map(word_map_path: Path) -> dict:
    return json.loads(word_map_path.read_text(encoding="utf-8"))


def map_english_to_dataset_key(english_text: str, word_map: dict | None) -> str:
    """
    Handles different word_map formats:
      - {"thank_you": true}
      - {"thank_you": {...}}
      - {"thank you": "thank_you"}
      - {"thank_you": "thank_you"} (pointless but ok)
    """
    raw = (english_text or "").strip().lower()
    if not raw:
        return ""

    key = normalize_key(raw)

    if not word_map:
        return key

    # direct key hit
    if key in word_map:
        v = word_map[key]
        return v if isinstance(v, str) and v else key

    # if map uses spaces as keys
    if raw in word_map:
        v = word_map[raw]
        if isinstance(v, str) and v:
            return normalize_key(v)
        return key

    # try loose: remove underscores
    key_loose = key.replace("_", "")
    for k, v in word_map.items():
        kk = normalize_key(str(k))
        if kk.replace("_", "") == key_loose:
            if isinstance(v, str) and v:
                return normalize_key(v)
            return kk

    return key


# ---------------- Teaching sequence for Literature ----------------
def build_literature_sequence(english_text: str, include_letters: bool = True) -> list[str]:
    txt = (english_text or "").strip()
    txt = re.sub(r"\s+", " ", txt)

    if not txt:
        return []

    # keep only letters/numbers/spaces
    clean = re.sub(r"[^a-zA-Z0-9\s]", "", txt).strip()
    clean = re.sub(r"\s+", " ", clean)

    # sentence -> words
    if " " in clean:
        return [w.lower() for w in clean.split() if w.strip()]

    # single word -> letters + word
    word = clean.lower()
    if include_letters:
        letters = [c for c in word if c.isalnum()]
        return letters + [word]
    return [word]


def get_close_suggestions(key: str, available_keys: list[str], n: int = 8) -> list[str]:
    return difflib.get_close_matches(key, available_keys, n=n, cutoff=0.55)


# ---------------- Main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, default=4.0)
    ap.add_argument("--model", type=str, default="small")
    ap.add_argument("--device", type=int, default=None, help="Mic device index (try 9 on your list)")
    ap.add_argument("--list-devices", action="store_true")
    ap.add_argument("--no-letters", action="store_true", help="Do not expand single word into letters")
    args = ap.parse_args()

    # list devices mode
    if args.list_devices:
        import sounddevice as sd
        print(sd.query_devices())
        print("default =", sd.default.device)
        return

    root = Path(__file__).resolve().parent

    assets_dir = root / "assets"
    words_dir = assets_dir / "skeletons" / "words"
    letters_dir = assets_dir / "skeletons" / "letters"  # optional
    word_map_path = assets_dir / "word_map.json"

    demo_out = root / "demo_outputs"
    demo_out.mkdir(exist_ok=True)

    # load word_map if exists
    word_map = None
    if word_map_path.exists():
        try:
            word_map = load_word_map(word_map_path)
        except Exception as e:
            print("[WARN] word_map.json exists but failed to load:", e)
            word_map = None

    # available keys from .npy files (for suggestions)
    available_word_keys = []
    if words_dir.exists():
        available_word_keys = [p.stem for p in words_dir.glob("*.npy")]

    print("Choose input type:")
    print("1. Speech (Sinhala -> English)")
    print("2. Text   (English typed)")
    choice = input("Enter choice (1/2): ").strip()

    if choice == "1":
        wav_path = demo_out / "live.wav"
        record_wav(wav_path, seconds=args.seconds, device=args.device)

        si_text = transcribe_sinhala(wav_path, model_size=args.model)
        print("\nSinhala detected:", si_text)

        en_text = translate_si_to_en(si_text)
        print("English translation:", en_text)

        english_text = en_text.strip()

    elif choice == "2":
        english_text = input("\nType your English word/sentence: ").strip()

    else:
        print("❌ Invalid choice")
        return

    if not english_text:
        print("\n[FAIL] English text is empty.")
        print("If you used Speech: your mic is silent OR Whisper returned nothing.")
        return

    # teaching sequence (literature)
    teaching_sequence = build_literature_sequence(english_text, include_letters=not args.no_letters)

    print("\n🔁 FINAL TEACHING SEQUENCE:")
    print(" → ".join(teaching_sequence))

    # build output items
    items_out = []

    for unit in teaching_sequence:
        unit_clean = (unit or "").strip().lower()
        if not unit_clean:
            continue

        # letter
        if len(unit_clean) == 1 and unit_clean.isalnum():
            p = letters_dir / f"{unit_clean}.npy"
            if p.exists():
                seq = np.load(p)
                items_out.append({
                    "unit": unit_clean,
                    "type": "letter",
                    "found": True,
                    "path": str(p),
                    "shape": list(seq.shape),
                    "skeleton": seq.tolist()
                })
            else:
                items_out.append({"unit": unit_clean, "type": "letter", "found": False})
            continue

        # word
        dataset_key = map_english_to_dataset_key(unit_clean, word_map)
        p = words_dir / f"{dataset_key}.npy"

        if p.exists():
            seq = np.load(p)
            items_out.append({
                "unit": unit_clean,
                "type": "word",
                "found": True,
                "dataset_key": dataset_key,
                "path": str(p),
                "shape": list(seq.shape),
                "skeleton": seq.tolist()
            })
        else:
            sug = get_close_suggestions(dataset_key, available_word_keys) if available_word_keys else []
            items_out.append({
                "unit": unit_clean,
                "type": "word",
                "found": False,
                "dataset_key": dataset_key,
                "suggestions": sug
            })

    final_output = {
        "literature_output": {
            "input_english_text": english_text,
            "teaching_sequence": teaching_sequence,
            "items": items_out
        }
    }

    out_json = demo_out / "literature_output.json"
    out_json.write_text(json.dumps(final_output, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n✅ Saved:", out_json.resolve())
    print("✅ Done")


if __name__ == "__main__":
    main()
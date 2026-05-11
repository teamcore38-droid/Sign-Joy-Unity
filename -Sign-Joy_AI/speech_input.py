import speech_recognition as sr
from googletrans import Translator


def _fallback_to_text_input():
    print("Switching to text input mode.")
    from text_input import get_text_input
    return get_text_input()


def get_speech_input():
    r = sr.Recognizer()
    translator = Translator()

    try:
        with sr.Microphone() as source:
            print("Speak now (Sinhala or English)...")
            r.adjust_for_ambient_noise(source, duration=0.5)
            audio = r.listen(source)
    except AttributeError:
        print("PyAudio is not installed, so microphone input is unavailable.")
        print("Install with: python -m pip install pyaudio")
        return _fallback_to_text_input()
    except OSError as e:
        print(f"Microphone is unavailable: {e}")
        return _fallback_to_text_input()

    # Try Sinhala first
    try:
        sinhala_text = r.recognize_google(audio, language="si-LK")
        print("Recognized Sinhala:", sinhala_text)

        translated = translator.translate(
            sinhala_text, src="si", dest="en"
        ).text

        print("Translated to English:", translated)
        return translated

    except Exception:
        try:
            english_text = r.recognize_google(audio, language="en-US")
            print("Recognized English:", english_text)
            return english_text
        except Exception as e:
            print("Speech recognition failed:", e)
            return _fallback_to_text_input()

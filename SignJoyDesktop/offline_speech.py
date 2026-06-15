import os
import sys
import json
from pathlib import Path

# Try to import Vosk and PyAudio for microphone capture
VOSK_AVAILABLE = False
try:
    from vosk import Model, KaldiRecognizer
    import pyaudio
    VOSK_AVAILABLE = True
except ImportError:
    pass

PROJECT_ROOT = Path(__file__).resolve().parent
MODEL_DIR = PROJECT_ROOT / "vosk_model"

def check_vosk_ready() -> tuple[bool, str]:
    """
    Checks if Vosk and its required models are installed and ready.
    Returns (is_ready, status_message).
    """
    if not VOSK_AVAILABLE:
        return False, "Vosk or PyAudio libraries are not installed. Run: pip install vosk pyaudio"
    
    if not MODEL_DIR.exists() or not os.listdir(MODEL_DIR):
        return False, f"Vosk model not found at '{MODEL_DIR}'. Please download a small model (e.g. 'vosk-model-small-en-us-0.15') and extract it there."
    
    return True, "Offline speech recognition is fully loaded and ready."

def recognize_from_microphone(timeout_seconds: float = 5.0) -> str:
    """
    Records from the local microphone and transcribes using the Vosk offline model.
    """
    is_ready, msg = check_vosk_ready()
    if not is_ready:
        print(f"Offline Speech Warning: {msg}")
        return ""

    try:
        model = Model(str(MODEL_DIR))
        recognizer = KaldiRecognizer(model, 16000)
        
        mic = pyaudio.PyAudio()
        stream = mic.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=16000,
            input=True,
            frames_per_buffer=8000
        )
        stream.start_stream()
        
        print("Microphone listening (Speak now)...")
        
        # Simple voice active detection loop
        frames = []
        silence_threshold = int(16000 * timeout_seconds / 8000)
        chunks_read = 0
        
        while chunks_read < silence_threshold:
            data = stream.read(4000, exception_on_overflow=False)
            if len(data) == 0:
                break
                
            if recognizer.AcceptWaveform(data):
                res = json.loads(recognizer.Result())
                text = res.get("text", "").strip()
                if text:
                    stream.stop_stream()
                    stream.close()
                    mic.terminate()
                    print(f"Recognized: {text}")
                    return text
            chunks_read += 1
            
        # Get final partial transcription if complete buffer matches
        res = json.loads(recognizer.FinalResult())
        stream.stop_stream()
        stream.close()
        mic.terminate()
        
        text = res.get("text", "").strip()
        print(f"Recognized (Final): {text}")
        return text

    except Exception as e:
        print(f"Failed to capture offline speech: {e}")
        return ""

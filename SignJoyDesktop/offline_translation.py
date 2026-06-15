import socket
import re
from googletrans import Translator as GoogleTranslator

# Local dictionary mapping Sinhala phrases and words to English equivalents.
# Supports numbers, math operations, and key literature/greeting vocabulary.
SINHALA_TO_ENGLISH_DICT = {
    # Numbers
    "බිංදුව": "zero",
    "එක": "one",
    "දෙක": "two",
    "තුන": "three",
    "හතර": "four",
    "පහ": "five",
    "හය": "six",
    "හත": "seven",
    "අට": "eight",
    "නමය": "nine",
    "දහය": "ten",
    "එකොළහ": "eleven",
    "දොළහ": "twelve",
    "දහතුන": "thirteen",
    "දහහතර": "fourteen",
    "පහළොව": "fifteen",
    "දහසය": "sixteen",
    "දහහත": "seventeen",
    "දහඅට": "eighteen",
    "දහනමය": "nineteen",
    "විස්ස": "twenty",
    
    # Operators
    "එකතු කිරීම": "add",
    "එකතු": "add",
    "ධන": "plus",
    "අඩු කිරීම": "subtract",
    "අඩු": "subtract",
    "සෘණ": "minus",
    "ගුණ කිරීම": "multiply",
    "වැඩි කිරීම": "multiply",
    "ගුණ": "multiply",
    "බෙදීම": "divide",
    "බෙදන්න": "divide",
    "සමානයි": "equal",
    "සමාන": "equal",
    
    # Greetings & Basic Phrases
    "ආයුබෝවන්": "ayubowan",
    "හෙලෝ": "hello",
    "කොහොමද": "how are you",
    "ස්තුතියි": "thank you",
    "ස්තූතියි": "thank you",
    
    # Colors
    "කළු": "black",
    "නිල්": "blue",
    "දුඹුරු": "brown",
    "රන්": "gold",
    "අළු": "gray",
    "කොළ": "green",
    "තැඹිලි": "orange",
    "රෝස": "pink",
    "දම්": "purple",
    "රතු": "red",
    "සුදු": "white",
    "කහ": "yellow",
    
    # People & Family
    "අම්මා": "mother",
    "තාත්තා": "father",
    "අක්කා": "elder sister",
    "නංගි": "younger sister",
    "අයියා": "elder bro",
    "මල්ලි": "younger bro",
    "පුතා": "son",
    "දුව": "daughter",
    "පවුල": "family",
    "බබා": "baby",
    "ළමයා": "child",
    "දොස්තර": "doctor",
    "පොලිසිය": "police",
    "සොරා": "thief",
    "මාමා": "uncle",
    "නැන්දා": "aunt",
    
    # Verbs
    "නානවා": "bathe",
    "කැඩීම": "break",
    "ගෙනෙනවා": "bring",
    "ගන්නවා": "buy",
    "යනවා": "go",
    "එනවා": "come",
    "කනවා": "eat",
    "බොනවා": "drink",
    "නටනවා": "dance",
    "අඬනවා": "cry",
    "හිනාවෙනවා": "smile",
    "සිනාසෙන්න": "laugh",
    "දුවනවා": "run",
    "පනිනවා": "jump",
    "නිදාගන්නවා": "sleep",
    "ලිවීම": "write",
    "කියවීම": "study",
    "ක්‍රීඩා": "play"
}

def local_translate(text: str) -> str:
    """
    Translates a Sinhala sentence to English offline using token matching.
    """
    cleaned = text.strip()
    if not cleaned:
        return ""
    
    # Try an exact phrase match first
    if cleaned in SINHALA_TO_ENGLISH_DICT:
        return SINHALA_TO_ENGLISH_DICT[cleaned]
    
    # Break down multi-word operators/phrases by sorting mapping keys by length
    # to match longest phrases first (e.g. "එකතු කිරීම" before "එකතු")
    sorted_keys = sorted(SINHALA_TO_ENGLISH_DICT.keys(), key=len, reverse=True)
    
    working_text = cleaned
    translated_tokens = []
    
    # Simple recursive tokenization match
    while working_text:
        working_text = working_text.strip()
        matched = False
        for key in sorted_keys:
            if working_text.startswith(key):
                translated_tokens.append(SINHALA_TO_ENGLISH_DICT[key])
                working_text = working_text[len(key):].strip()
                matched = True
                break
        
        if not matched:
            # Take the first word and keep it as is if no translation found
            parts = working_text.split(None, 1)
            token = parts[0]
            translated_tokens.append(token)
            working_text = parts[1] if len(parts) > 1 else ""
            
    return " ".join(translated_tokens)


class Detected:
    def __init__(self, lang):
        self.lang = lang


class Translated:
    def __init__(self, text):
        self.text = text


class Translator:
    """
    Drop-in offline replacement for googletrans.Translator
    """
    def __init__(self):
        self._online_translator = None
        self._is_online = None

    def check_online(self) -> bool:
        if self._is_online is not None:
            return self._is_online
        try:
            # Connect to highly available DNS or endpoint
            socket.setdefaulttimeout(1.2)
            socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect(("8.8.8.8", 53))
            self._is_online = True
        except Exception:
            self._is_online = False
        return self._is_online

    def get_online_translator(self):
        if self._online_translator is None:
            self._online_translator = GoogleTranslator()
        return self._online_translator

    def detect(self, text: str) -> Detected:
        if self.check_online():
            try:
                res = self.get_online_translator().detect(text)
                return Detected(res.lang)
            except Exception:
                pass
        
        # Fallback Offline detection
        for char in text:
            if '\u0D80' <= char <= '\u0DFF':
                return Detected("si")
        return Detected("en")

    def translate(self, text: str, src: str = "si", dest: str = "en") -> Translated:
        if self.check_online():
            try:
                res = self.get_online_translator().translate(text, src=src, dest=dest)
                return Translated(res.text)
            except Exception:
                pass
                
        # Offline Translation
        translated_text = local_translate(text)
        return Translated(translated_text)

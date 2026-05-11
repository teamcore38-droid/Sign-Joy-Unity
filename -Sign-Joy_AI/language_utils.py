from googletrans import Translator

translator = Translator()

def is_sinhala(text):
    for ch in text:
        if '\u0D80' <= ch <= '\u0DFF':
            return True
    return False


def translate_to_english(text):
    translated = translator.translate(text, src='si', dest='en')
    return translated.text

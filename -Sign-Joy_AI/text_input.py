from googletrans import Translator

def get_text_input():
    text = input("Enter text (Sinhala or English): ")
    translator = Translator()

    detected = translator.detect(text).lang

    if detected == "si":
        translated = translator.translate(text, src="si", dest="en").text
        print("Translated to English:", translated)
        return translated

    return text

def extract_keywords(text):
    text = text.lower()

    # Normalize common phrases
    replacements = {
        "divided by": "divide",
        "multiply by": "multiply",
        "into": "multiply",
        "times": "multiply",
        "plus": "add",
        "minus": "subtract"
    }

    for k, v in replacements.items():
        text = text.replace(k, v)

    number_map = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
        "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20
    }

    operators = {
        "add", "plus", "minus", "subtract",
        "multiply", "divide", "division"
    }

    numbers = []
    ops = []

    for word in text.split():
        if word.isdigit():
            numbers.append(int(word))
        elif word in number_map:
            numbers.append(number_map[word])
        elif word in operators:
            ops.append(word)

    result = {
        "numbers": numbers,
        "operators": ops
    }

    print("Extracted keywords:", result)
    return result

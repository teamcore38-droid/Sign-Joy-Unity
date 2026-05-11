import os
from pathlib import Path

BASE_DATASET_PATH = Path(__file__).resolve().parent / "datasets" / "Numbers"


def map_keyword_to_media(keyword):

    number_word_map = {
        0: "zero",
        1: "one",
        2: "two",
        3: "three",
        4: "four",
        5: "five",
        6: "six",
        7: "seven",
        8: "eight",
        9: "nine",
        10: "ten",
        11: "eleven",
        12: "twelve",
        13: "thirteen",
        14: "fourteen",
        15: "fifteen",
        16: "sixteen",
        17: "seventeen",
        18: "eighteen",
        19: "nineteen",
        20: "twenty"
    }

    operator_folder_map = {
        "add": "Addition",
        "plus": "Addition",
        "subtract": "Subtraction",
        "minus": "Subtraction",
        "multiply": "Multiplication",
        "into": "Multiplication",
        "divide": "Divide",
        "division": "Divide",
        "equal": "Equal"
    }

    # Convert numeric result to word
    if isinstance(keyword, int):
        keyword = number_word_map.get(keyword, str(keyword))

    keyword = str(keyword).lower()

    # -------------------------
    # OPERATOR MATCH
    # -------------------------
    if keyword in operator_folder_map:
        folder_name = operator_folder_map[keyword]
        folder_path = BASE_DATASET_PATH / folder_name

        if folder_path.exists():
            print(f"   Matched operator folder: {folder_path}")
            return str(folder_path)
        else:
            print(f"   Operator folder not found: {folder_name}")
            return None

    # -------------------------
    # EXACT NUMBER MATCH
    # -------------------------
    if not BASE_DATASET_PATH.exists():
        print(f"   Dataset path not found: {BASE_DATASET_PATH}")
        return None

    for folder in os.listdir(BASE_DATASET_PATH):

        folder_lower = folder.lower()

        # Handle folders like "7. seven"
        if ". " in folder_lower:
            number_part, word_part = folder_lower.split(". ", 1)

            if keyword == word_part.strip():
                folder_path = BASE_DATASET_PATH / folder
                print(f"   Matched number folder: {folder_path}")
                return str(folder_path)

    print(f"   No folder matched for keyword: {keyword}")
    return None

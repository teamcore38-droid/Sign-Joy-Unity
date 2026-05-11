# main.py

import os
import json
from pathlib import Path

from speech_input import get_speech_input
from text_input import get_text_input
from keyword_extraction import extract_keywords
from calculator import perform_calculation
from gesture_mapping import map_keyword_to_media
from gesture_output import extract_hand_coords_from_media
from gesture_output import display_skeleton_video


def main():

    print("Choose input type:")
    print("1. Speech")
    print("2. Text")

    choice = input("Enter choice (1/2): ").strip()

    if choice == "1":
        english_text = get_speech_input()
    elif choice == "2":
        english_text = get_text_input()
    else:
        print("Invalid choice")
        return

    print("\nFinal English Text:", english_text)

    # ----------------------------------------------
    # KEYWORD EXTRACTION
    # ----------------------------------------------
    keywords = extract_keywords(english_text)

    # ----------------------------------------------
    # CALCULATION (NOT MODIFIED)
    # ----------------------------------------------
    result, expression = perform_calculation(keywords)

    print("\n" + "=" * 50)
    print("CALCULATION")
    print("=" * 50)
    print("Expression:", expression)
    print("Result:", result)
    print("=" * 50)

    # ----------------------------------------------
    # FINAL TEACHING SEQUENCE
    # ----------------------------------------------
    teaching_sequence = []

    if len(keywords["numbers"]) >= 2 and len(keywords["operators"]) >= 1:
        teaching_sequence.append(str(keywords["numbers"][0]))
        teaching_sequence.append(keywords["operators"][0])
        teaching_sequence.append(str(keywords["numbers"][1]))

    teaching_sequence.append("equal")

    if isinstance(result, float) and result.is_integer():
        teaching_sequence.append(str(int(result)))
    else:
        teaching_sequence.append(str(result))

    print("\nFINAL TEACHING SEQUENCE:")
    print(" -> ".join(teaching_sequence))

    # ----------------------------------------------
    # DATASET HAND KEYPOINT EXTRACTION
    # ----------------------------------------------
    print("\nDATASET HAND KEYPOINT EXTRACTION")

    all_keywords = []
    all_keywords.extend(keywords["numbers"])
    all_keywords.extend(keywords["operators"])
    all_keywords.append("equal")

    if isinstance(result, float) and result.is_integer():
        all_keywords.append(int(result))
    else:
        all_keywords.append(result)

    all_keyword_outputs = []

    for kw in all_keywords:

        print(f"\n- Keyword: {kw}")

        folder_path = map_keyword_to_media(kw)

        if folder_path is None:
            continue

        print(f"  Matched Folder: {folder_path}")

        video_files = [
            f for f in os.listdir(folder_path)
            if f.lower().endswith((".mp4", ".avi", ".mov"))
        ]

        if not video_files:
            print("   No video found inside folder")
            continue

        video_path = os.path.join(folder_path, video_files[0])
        print(f"   Using video: {video_path}")

        # Original coordinate extraction
        keypoints_data = extract_hand_coords_from_media(video_path)

        if keypoints_data:
            all_keyword_outputs.append({
                "keyword": str(kw),
                "data": keypoints_data
            })

            print(f"   Frames extracted: {keypoints_data['total_frames_with_landmarks']}")

        # Skeleton display
        print("   Showing MediaPipe skeleton...")
        display_skeleton_video(video_path)

    # ----------------------------------------------
    # SAVE JSON (UNCHANGED)
    # ----------------------------------------------
    final_output = {
        "math_ai_output": {
            "model_version": "1.0",
            "sampling_strategy": "every_5th_frame",
            "teaching_sequence": teaching_sequence,
            "keywords": all_keyword_outputs
        }
    }

    Path("outputs").mkdir(exist_ok=True)

    with open("outputs/hand_coordinates.json", "w") as f:
        json.dump(final_output, f, indent=4)

    print("\nAll keyword keypoints saved in outputs/hand_coordinates.json")
    print("Process completed successfully")


if __name__ == "__main__":
    main()

# gesture_output.py

import cv2
import mediapipe as mp
import numpy as np


# =========================================================
# 1) EXTRACT HAND COORDINATES (EVERY 5TH FRAME)
# =========================================================
def extract_hand_coords_from_media(media_path):

    print("Processing media:", media_path)

    cap = cv2.VideoCapture(media_path)

    if not cap.isOpened():
        print("Cannot open video file.")
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,   # allow both hands
        min_detection_confidence=0.7
    )

    frame_index = 0
    frames_output = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Process every 5th frame
        if frame_index != 0 and frame_index % 5 == 0:

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)

            if result.multi_hand_landmarks:

                for hand_index, hand_landmarks in enumerate(result.multi_hand_landmarks):

                    # Detect Left / Right hand
                    hand_label = result.multi_handedness[hand_index].classification[0].label

                    landmark_list = []

                    for idx, lm in enumerate(hand_landmarks.landmark):
                        landmark_list.append({
                            "hand": hand_label,
                            "landmark_id": f"L{idx}",
                            "x": float(lm.x),
                            "y": float(lm.y),
                            "z": float(lm.z)
                        })

                    frames_output.append({
                        "frame_number": frame_index,
                        "timestamp_sec": round(frame_index / fps, 3),
                        "hand_label": hand_label,
                        "hand_keypoints": landmark_list
                    })

                    print(f"   Detected {hand_label} hand in frame {frame_index}")

        frame_index += 1

    cap.release()

    return {
        "video_info": {
            "total_frames": total_frames,
            "fps": fps,
            "duration_seconds": round(duration, 2)
        },
        "sampling_strategy": "every_5th_frame",
        "frames": frames_output,
        "total_frames_with_landmarks": len(frames_output)
    }


# =========================================================
# 2) CLEAN SKELETON DISPLAY (BOTH HANDS)
# =========================================================
def display_skeleton_video(media_path):

    cap = cv2.VideoCapture(media_path)

    if not cap.isOpened():
        print("Cannot open video file.")
        return

    mp_hands = mp.solutions.hands
    mp_draw = mp.solutions.drawing_utils

    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,  # detect both hands
        min_detection_confidence=0.7
    )

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        h, w, _ = frame.shape

        # Black background
        black_canvas = np.zeros((h, w, 3), dtype=np.uint8)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)

        if result.multi_hand_landmarks:

            for hand_index, hand_landmarks in enumerate(result.multi_hand_landmarks):

                hand_label = result.multi_handedness[hand_index].classification[0].label

                # Color coding: Left = Green, Right = Blue
                if hand_label == "Left":
                    connection_color = (0, 255, 0)
                else:
                    connection_color = (255, 0, 0)

                mp_draw.draw_landmarks(
                    black_canvas,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_draw.DrawingSpec(color=connection_color, thickness=2, circle_radius=4),
                    mp_draw.DrawingSpec(color=(255,255,255), thickness=2)
                )

                # Show landmark IDs
                for idx, lm in enumerate(hand_landmarks.landmark):
                    cx, cy = int(lm.x * w), int(lm.y * h)

                    cv2.putText(
                        black_canvas,
                        f"L{idx}",
                        (cx, cy),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.4,
                        (0, 255, 255),
                        1
                    )

        cv2.imshow("Clean Hand Skeleton (Both Hands)", black_canvas)

        if cv2.waitKey(25) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()

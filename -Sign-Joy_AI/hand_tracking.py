# hand_tracking.py

import cv2
import mediapipe as mp
import time

mp_hands = mp.solutions.hands
hands = mp_hands.Hands()

def capture_hand_data(duration=3):
    cap = cv2.VideoCapture(0)
    start = time.time()

    frames = []

    while time.time() - start < duration:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        if results.multi_hand_landmarks:
            for hand in results.multi_hand_landmarks:
                frame_data = []
                for lm in hand.landmark:
                    frame_data.append([lm.x, lm.y, lm.z])
                frames.append({
                    "time": time.time() - start,
                    "landmarks": frame_data
                })

    cap.release()
    return frames

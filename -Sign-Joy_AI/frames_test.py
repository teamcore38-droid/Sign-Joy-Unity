import cv2
import mediapipe as mp
import json

# ---------------------------------------------------
# ✅ CHANGE THIS TO YOUR VIDEO PATH
# ---------------------------------------------------
video_path = r"C:\SLIIT\FYP\AI models\Model t3\datasets\Numbers\2. two\2. two_001.mp4"

cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("❌ Cannot open video file.")
    exit()

# ---------------------------------------------------
# Video Information
# ---------------------------------------------------
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
duration = total_frames / fps if fps > 0 else 0

print("Total Frames in Video:", total_frames)
print("Video FPS:", fps)
print("Video Duration (seconds):", round(duration, 2))

# ---------------------------------------------------
# Initialize MediaPipe Hands
# ---------------------------------------------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7
)

frame_index = 0
frames_output = []

# ---------------------------------------------------
# Frame Processing Loop
# ---------------------------------------------------
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # ✅ Take every 5th frame (skip frame 0 if needed)
    if frame_index != 0 and frame_index % 5 == 0:

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)

        if result.multi_hand_landmarks:
            for hand in result.multi_hand_landmarks:

                coords = []
                for lm in hand.landmark:
                    coords.append({
                        "x": float(lm.x),
                        "y": float(lm.y),
                        "z": float(lm.z)
                    })

                frames_output.append({
                    "frame_number": frame_index,
                    "timestamp_sec": round(frame_index / fps, 3),
                    "landmarks": coords
                })

                print(f"✅ Landmarks detected in frame {frame_index}")

    frame_index += 1

cap.release()

# ---------------------------------------------------
# JSON Output Structure
# ---------------------------------------------------
output_data = {
    "video_info": {
        "total_frames": total_frames,
        "fps": fps,
        "duration_seconds": round(duration, 2)
    },
    "sampling_rule": "Every 5th frame",
    "frames": frames_output,
    "total_frames_with_landmarks": len(frames_output)
}

# ---------------------------------------------------
# Save JSON File
# ---------------------------------------------------
with open("frames_test.json", "w") as f:
    json.dump(output_data, f, indent=4)

print("\n✅ frames_test.json created successfully")
print("Total frames with landmarks:", len(frames_output))

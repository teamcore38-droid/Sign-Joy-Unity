import cv2
import time

from hand_tracking import get_hand_landmarks
from gesture_predict import predict_gesture

cap = cv2.VideoCapture(0)

current_gesture = None
gesture_start_time = None

while True:
    ret, frame = cap.read()
    if not ret:
        break

    landmarks = get_hand_landmarks(frame)

    if landmarks:
        gesture = predict_gesture(frame)

        if gesture != current_gesture:
            current_gesture = gesture
            gesture_start_time = time.time()
        else:
            duration = time.time() - gesture_start_time

            cv2.putText(
                frame,
                f"{gesture} : {duration:.2f}s",
                (30, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 0),
                2
            )

    cv2.imshow("Gesture Recognition", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()

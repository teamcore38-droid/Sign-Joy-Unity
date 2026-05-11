import numpy as np
import cv2
import tensorflow as tf

# Load trained model
model = tf.keras.models.load_model("gesture_model.keras")

# Class names (MUST match dataset folders)
CLASS_NAMES = list(model.class_names) if hasattr(model, 'class_names') else [
    "okay", "palm", "thumbs_down", "thumbs_up"
]

IMG_SIZE = 64

def predict_gesture(frame):
    img = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
    img = img / 255.0
    img = np.expand_dims(img, axis=0)

    predictions = model.predict(img)
    class_index = np.argmax(predictions)

    return CLASS_NAMES[class_index]

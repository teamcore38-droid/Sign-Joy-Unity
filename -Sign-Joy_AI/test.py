import tensorflow as tf
import mediapipe as mp
import cv2
import numpy as np

print("TF:", tf.__version__)
print("MP:", mp.__version__)
print("CV:", cv2.__version__)
print("NP:", np.__version__)
print("Hands OK:", mp.solutions.hands.Hands)

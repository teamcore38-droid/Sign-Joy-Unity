import tensorflow as tf
from keras.preprocessing.image import ImageDataGenerator

def train_gesture_model():
    """
    Train CNN model on gesture dataset (images).
    """
    datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)

    train_data = datagen.flow_from_directory(
        'datasets/',
        target_size=(64,64),
        batch_size=32,
        class_mode='categorical',
        subset='training'
    )

    val_data = datagen.flow_from_directory(
        'datasets/',
        target_size=(64,64),
        batch_size=32,
        class_mode='categorical',
        subset='validation'
    )

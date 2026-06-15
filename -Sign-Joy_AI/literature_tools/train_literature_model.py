import os
import json
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

# =======================
# CONFIG (edit if needed)
# =======================
FEATURES_DIR = Path("data/features")          # where your .npy live
OUT_DIR = Path("models")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = OUT_DIR / "literature_model.h5"
LABELS_PATH = OUT_DIR / "label_map.json"

SEQ_LEN = 60          # must match extractor output length
MIN_SAMPLES_PER_CLASS = 30

SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)


def pad_or_trim(x: np.ndarray, seq_len: int) -> np.ndarray:
    # x shape: (T, F)
    if x.ndim != 2:
        raise ValueError(f"Expected 2D array (T,F), got {x.shape}")
    t, f = x.shape
    if t == seq_len:
        return x
    if t > seq_len:
        return x[:seq_len, :]
    # pad with zeros
    pad = np.zeros((seq_len - t, f), dtype=x.dtype)
    return np.vstack([x, pad])


def load_dataset(features_dir: Path):
    X_list = []
    y_list = []

    # Expect structure: data/features/<label>/*.npy
    label_dirs = [p for p in features_dir.iterdir() if p.is_dir()]

    # Count samples per class
    counts = {}
    for ld in label_dirs:
        counts[ld.name] = len(list(ld.rglob("*.npy")))

    # Filter weak classes
    keep_labels = {k for k, v in counts.items() if v >= MIN_SAMPLES_PER_CLASS}
    dropped = {k: v for k, v in counts.items() if k not in keep_labels}

    print("Classes found:", len(counts))
    if dropped:
        print("Dropping small classes (<", MIN_SAMPLES_PER_CLASS, "samples):")
        for k, v in sorted(dropped.items(), key=lambda z: z[1]):
            print(f"  - {k}: {v}")

    # Load files
    all_files = []
    for ld in label_dirs:
        if ld.name not in keep_labels:
            continue
        for f in ld.rglob("*.npy"):
            all_files.append((f, ld.name))

    print("Total feature files used:", len(all_files))
    if not all_files:
        raise RuntimeError("No feature files found. Check data/features structure.")

    # Load first file to get feature dim
    sample_x = np.load(all_files[0][0])
    sample_x = pad_or_trim(sample_x, SEQ_LEN)
    feat_dim = sample_x.shape[1]
    print("Feature shape per sample:", (SEQ_LEN, feat_dim))

    for fpath, label in all_files:
        x = np.load(fpath)
        x = pad_or_trim(x, SEQ_LEN).astype(np.float32)
        X_list.append(x)
        y_list.append(label)

    X = np.stack(X_list, axis=0)  # (N, T, F)
    y = np.array(y_list)
    return X, y, feat_dim


def build_model(seq_len: int, feat_dim: int, n_classes: int):
    inp = layers.Input(shape=(seq_len, feat_dim))
    x = layers.Masking(mask_value=0.0)(inp)
    x = layers.Conv1D(128, 5, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.2)(x)

    x = layers.Bidirectional(layers.LSTM(128, return_sequences=False))(x)
    x = layers.Dropout(0.3)(x)

    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.3)(x)

    out = layers.Dense(n_classes, activation="softmax")(x)

    model = models.Model(inp, out)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main():
    X, y_labels, feat_dim = load_dataset(FEATURES_DIR)

    le = LabelEncoder()
    y = le.fit_transform(y_labels)

    # Save label map (index -> label)
    label_map = {int(i): str(lbl) for i, lbl in enumerate(le.classes_)}
    with open(LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(label_map, f, indent=2, ensure_ascii=False)
    print("Saved label map:", LABELS_PATH.resolve())

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    model = build_model(SEQ_LEN, feat_dim, n_classes=len(le.classes_))
    model.summary()

    cb = [
        callbacks.ModelCheckpoint(
            filepath=str(MODEL_PATH),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(monitor="val_accuracy", patience=8, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, verbose=1),
    ]

    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=40,
        batch_size=32,
        callbacks=cb,
        verbose=1,
    )

    # Evaluate
    y_pred = np.argmax(model.predict(X_val, verbose=0), axis=1)
    acc = accuracy_score(y_val, y_pred)
    print("\nValidation Accuracy:", acc)
    print("\nClassification report:\n", classification_report(y_val, y_pred, target_names=le.classes_))

    # Save final model
    model.save(MODEL_PATH)
    print("Saved model:", MODEL_PATH.resolve())


if __name__ == "__main__":
    main()
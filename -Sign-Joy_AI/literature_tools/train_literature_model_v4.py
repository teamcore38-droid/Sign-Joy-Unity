import re
import json
from pathlib import Path
from collections import Counter

import numpy as np
from sklearn.model_selection import StratifiedShuffleSplit, GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
from sklearn.utils.class_weight import compute_class_weight

import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

# ===================== PATHS =====================
FEATURES_DIR = Path("data/features")          # expects .npy files inside
META_PATH = Path("data/features_meta.json")   # optional
OUT_DIR = Path("models")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = OUT_DIR / "literature_model_v4.keras"
LABELS_PATH = OUT_DIR / "label_map_v4.json"
SCALER_PATH = OUT_DIR / "scaler_v4.json"

# ===================== SETTINGS =====================
SEED = 42
SEQ_LEN = 30
MIN_SAMPLES_PER_CLASS = 30

# Demo knob: if you want fewer classes for higher accuracy, set TOP_N_LABELS like 30 or 50.
# Set None to keep all.
TOP_N_LABELS = None

np.random.seed(SEED)
tf.random.set_seed(SEED)


# ===================== HELPERS =====================
def pad_or_trim(x: np.ndarray, seq_len: int) -> np.ndarray:
    if x.ndim != 2:
        raise ValueError(f"Expected (T,F), got {x.shape}")
    t, f = x.shape
    if t == seq_len:
        return x
    if t > seq_len:
        return x[:seq_len, :]
    pad = np.zeros((seq_len - t, f), dtype=x.dtype)
    return np.vstack([x, pad])


def infer_subject(text: str) -> str:
    t = text.lower()
    m = re.search(r"(subject[_\-]?\d+|user[_\-]?\d+|u\d+|s\d+|archive[_\-]?\d+)", t)
    return m.group(1) if m else "unknown"


def subject_from_feature_path(npy_path: Path) -> str:
    """
    If structure is:
      data/features/<label>/<subject>/file.npy
    then subject is rel.parts[1]
    """
    try:
        root = FEATURES_DIR.resolve()
        rel = npy_path.resolve().relative_to(root)
        if len(rel.parts) >= 3:
            return rel.parts[1].lower()
    except Exception:
        pass
    return "unknown"


def load_items():
    items = []

    # Try meta
    if META_PATH.exists():
        try:
            meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        except Exception:
            meta = None

        if isinstance(meta, dict) and "items" in meta:
            meta_items = meta["items"]
        elif isinstance(meta, list):
            meta_items = meta
        else:
            meta_items = []

        for it in meta_items:
            if not isinstance(it, dict):
                continue
            label = it.get("label") or it.get("class") or it.get("keyword")
            npy = it.get("npy") or it.get("out_npy") or it.get("feature_path") or it.get("path")
            src = it.get("src") or it.get("src_path") or it.get("video") or it.get("file")
            if not label or not npy:
                continue

            npy_path = Path(npy)
            if not npy_path.is_absolute():
                npy_path = (Path(".") / npy_path).resolve()
            if not npy_path.exists():
                continue

            g = infer_subject(str(src) if src else str(npy_path))
            if g == "unknown":
                g = subject_from_feature_path(npy_path)

            items.append((npy_path, str(label), g))

    # Fallback scan
    if not items:
        if not FEATURES_DIR.exists():
            raise RuntimeError(f"FEATURES_DIR not found: {FEATURES_DIR.resolve()}")

        for label_dir in FEATURES_DIR.iterdir():
            if not label_dir.is_dir():
                continue
            for f in label_dir.rglob("*.npy"):
                g = subject_from_feature_path(f)
                if g == "unknown":
                    g = infer_subject(str(f))
                items.append((f, label_dir.name, g))

    return items


def normalize_hands_per_frame(x: np.ndarray) -> np.ndarray:
    """
    If feature dim is 126, assume two hands each 21 landmarks with (x,y,z) => 63 dims per hand.
    We do a simple per-frame normalization per hand:
      - subtract wrist (landmark 0)
      - divide by palm width (distance between index_mcp=5 and pinky_mcp=17) if possible
    If dim doesn't match, return x unchanged.
    """
    T, F = x.shape
    if F != 126:
        return x

    out = x.copy()
    for hand in range(2):
        base = hand * 63
        hand_vec = out[:, base:base+63].reshape(T, 21, 3)

        wrist = hand_vec[:, 0:1, :]                  # (T,1,3)
        hand_vec = hand_vec - wrist                  # center

        p1 = hand_vec[:, 5, :]                       # index_mcp
        p2 = hand_vec[:, 17, :]                      # pinky_mcp
        scale = np.linalg.norm(p1 - p2, axis=1)      # (T,)
        scale = np.where(scale < 1e-6, 1.0, scale)   # avoid div0
        hand_vec = hand_vec / scale[:, None, None]

        out[:, base:base+63] = hand_vec.reshape(T, 63)

    return out


def add_velocity_features(x: np.ndarray) -> np.ndarray:
    """
    Append first-order temporal difference (velocity) features.
    x: (T,F) -> returns (T, 2F)
    """
    v = np.zeros_like(x)
    v[1:] = x[1:] - x[:-1]
    return np.concatenate([x, v], axis=1)


def compute_standardizer(X: np.ndarray):
    """
    Compute mean/std over train set across (N,T,F)
    returns mean(F), std(F)
    """
    # flatten N*T as samples
    flat = X.reshape(-1, X.shape[-1])
    mean = flat.mean(axis=0)
    std = flat.std(axis=0)
    std = np.where(std < 1e-6, 1.0, std)
    return mean, std


def apply_standardizer(X: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    return (X - mean[None, None, :]) / std[None, None, :]


def build_model(seq_len: int, feat_dim: int, n_classes: int):
    inp = layers.Input(shape=(seq_len, feat_dim))

    x = layers.LayerNormalization()(inp)

    x = layers.Conv1D(256, 5, padding="same", activation="relu")(x)
    x = layers.Dropout(0.25)(x)

    # Transformer-ish block
    attn = layers.MultiHeadAttention(num_heads=4, key_dim=64)(x, x)
    x = layers.Add()([x, attn])
    x = layers.LayerNormalization()(x)

    ff = layers.Dense(512, activation="relu")(x)
    ff = layers.Dropout(0.25)(ff)
    ff = layers.Dense(256)(ff)
    x = layers.Add()([x, ff])
    x = layers.LayerNormalization()(x)

    x_avg = layers.GlobalAveragePooling1D()(x)
    x_max = layers.GlobalMaxPooling1D()(x)
    x = layers.Concatenate()([x_avg, x_max])

    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.35)(x)
    out = layers.Dense(n_classes, activation="softmax")(x)

    model = models.Model(inp, out)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(3e-4),
        loss="sparse_categorical_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.SparseTopKCategoricalAccuracy(k=5, name="top5")
        ],
    )
    return model


# ===================== MAIN =====================
def main():
    items = load_items()
    if not items:
        raise RuntimeError("No feature items found.")

    print("\nSample label/group check (first 10):")
    for p, lab, g in items[:10]:
        print(lab, "|", g, "|", p.name)

    counts = Counter([lab for _, lab, _ in items])
    keep = {k for k, v in counts.items() if v >= MIN_SAMPLES_PER_CLASS}
    items = [(p, lab, g) for (p, lab, g) in items if lab in keep]

    # Optional: keep only top-N most frequent labels
    if TOP_N_LABELS is not None:
        freq = Counter([lab for _, lab, _ in items]).most_common(TOP_N_LABELS)
        top = {k for k, _ in freq}
        items = [(p, lab, g) for (p, lab, g) in items if lab in top]

    counts2 = Counter([lab for _, lab, _ in items])
    print("\nTotal labels (before):", len(counts))
    print("Labels kept now:", len(counts2))
    print("Total samples:", len(items))

    x0 = np.load(items[0][0])
    feat_dim0 = x0.shape[1]
    print("\nDetected first sample shape:", x0.shape)
    print("Using SEQ_LEN:", SEQ_LEN, "FEATURE_DIM:", feat_dim0)

    X, y_labels, groups = [], [], []
    for p, lab, g in items:
        x = np.load(p).astype(np.float32)
        x = pad_or_trim(x, SEQ_LEN)
        x = normalize_hands_per_frame(x)
        x = add_velocity_features(x)       # motion features
        X.append(x)
        y_labels.append(lab)
        groups.append(g)

    X = np.stack(X, axis=0)               # (N,T,F2)
    y_labels = np.array(y_labels)
    groups = np.array(groups)

    le = LabelEncoder()
    y = le.fit_transform(y_labels)

    LABELS_PATH.write_text(
        json.dumps({int(i): str(lbl) for i, lbl in enumerate(le.classes_)}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print("\nSaved label map:", LABELS_PATH.resolve())

    uniq_groups = sorted(set(groups.tolist()))
    usable_groups = [g for g in uniq_groups if g != "unknown"]
    if len(usable_groups) >= 2:
        print("\nSplit mode: GROUP (by subject)")
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
        train_idx, val_idx = next(splitter.split(X, y, groups=groups))
    else:
        print("\nSplit mode: STRATIFIED RANDOM (no usable subject IDs found)")
        splitter = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
        train_idx, val_idx = next(splitter.split(X, y))

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]

    print("Train samples:", len(train_idx), "Val samples:", len(val_idx))

    # Standardize using train stats only
    mean, std = compute_standardizer(X_train)
    X_train = apply_standardizer(X_train, mean, std)
    X_val = apply_standardizer(X_val, mean, std)

    SCALER_PATH.write_text(
        json.dumps({"mean": mean.tolist(), "std": std.tolist()}, ensure_ascii=False),
        encoding="utf-8",
    )
    print("Saved scaler:", SCALER_PATH.resolve())

    # class weights
    classes = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    class_weight = {int(c): float(w) for c, w in zip(classes, weights)}

    model = build_model(SEQ_LEN, X_train.shape[-1], n_classes=len(le.classes_))
    model.summary()

    cb = [
        callbacks.ModelCheckpoint(str(MODEL_PATH), monitor="val_accuracy", save_best_only=True, verbose=1),
        callbacks.EarlyStopping(monitor="val_accuracy", patience=10, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, verbose=1),
    ]

    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=60,
        batch_size=32,
        class_weight=class_weight,
        callbacks=cb,
        verbose=1,
    )

    y_pred = np.argmax(model.predict(X_val, verbose=0), axis=1)
    acc = accuracy_score(y_val, y_pred)
    print("\nValidation Accuracy:", acc)

    present = np.unique(np.concatenate([y_val, y_pred]))
    print(
        "\nClassification report:\n",
        classification_report(
            y_val,
            y_pred,
            labels=present,
            target_names=le.classes_[present],
            zero_division=0
        )
    )

    model.save(MODEL_PATH)
    print("Saved model:", MODEL_PATH.resolve())


if __name__ == "__main__":
    main()
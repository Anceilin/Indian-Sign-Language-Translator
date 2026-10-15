"""
ISL Gesture Classifier - Training Script
=========================================
Dataset: dataset/gesture.json
Features: MediaPipe 21-landmark (x,y,z) from hand1  =>  63-dimensional feature vector
Model: Small feedforward neural network (Keras/TensorFlow)
Output: ai/model/ (TensorFlow.js compatible format)
"""

import json
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import tensorflow as tf
import os

# ─── 1. Load dataset ───────────────────────────────────────────────────────────
DATASET_PATH = '../dataset/gesture.json'
with open(DATASET_PATH, 'r') as f:
    data = json.load(f)

# ─── 2. Discover labels from the dataset ───────────────────────────────────────
all_labels_in_data = sorted(set(d['label'] for d in data))
print(f"Labels found in dataset: {all_labels_in_data}")

labels = all_labels_in_data          # ['Hello', 'Water'] – derived from actual data
label_to_idx = {l: i for i, l in enumerate(labels)}

# ─── 3. Extract features and labels ────────────────────────────────────────────
X = []
y = []

skipped = 0
for sample in data:
    label = sample.get('label')
    if label not in labels:
        skipped += 1
        continue

    hand1 = sample.get('hand1')
    if not hand1 or len(hand1) != 21:
        skipped += 1
        continue

    # Flatten 21 (x, y, z) into a 63-dim feature vector
    features = []
    for pt in hand1:
        features.extend([pt['x'], pt['y'], pt['z']])

    X.append(features)
    y.append(label_to_idx[label])

X = np.array(X, dtype=np.float32)
y = np.array(y, dtype=np.int32)

print(f"\n{'='*50}")
print(f"  Total samples used        : {len(y)}")
for label in labels:
    print(f"  {label:20s} samples : {np.sum(y == label_to_idx[label])}")
if skipped:
    print(f"  Skipped (bad data)        : {skipped}")
print(f"{'='*50}\n")

# ─── 4. Train / validation split (80/20 stratified) ───────────────────────────
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training samples  : {len(y_train)}")
for label in labels:
    idx = label_to_idx[label]
    print(f"  {label:20s} (train): {np.sum(y_train == idx)}")

print(f"Validation samples: {len(y_val)}")
for label in labels:
    idx = label_to_idx[label]
    print(f"  {label:20s} (val)  : {np.sum(y_val == idx)}")

# ─── 5. Build model ────────────────────────────────────────────────────────────
model = tf.keras.models.Sequential([
    tf.keras.Input(shape=(63,), name="landmarks"),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(len(labels), activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)
model.summary()

# ─── 6. Train ──────────────────────────────────────────────────────────────────
print("\nTraining model (50 epochs) ...")
history = model.fit(
    X_train, y_train,
    epochs=50,
    validation_data=(X_val, y_val),
    verbose=0
)

# ─── 7. Evaluate ───────────────────────────────────────────────────────────────
y_pred_train = np.argmax(model.predict(X_train, verbose=0), axis=1)
y_pred_val   = np.argmax(model.predict(X_val,   verbose=0), axis=1)

train_acc = accuracy_score(y_train, y_pred_train)
val_acc   = accuracy_score(y_val,   y_pred_val)

print(f"\n{'='*50}")
print(f"  Training   Accuracy: {train_acc * 100:.2f}%")
print(f"  Validation Accuracy: {val_acc   * 100:.2f}%")
print(f"{'='*50}\n")

print("Classification Report (Validation):")
print(classification_report(y_val, y_pred_val, target_names=labels, labels=list(range(len(labels)))))

print("Confusion Matrix (Validation):")
cm = confusion_matrix(y_val, y_pred_val, labels=list(range(len(labels))))
print(f"  Labels: {labels}")
print(cm)

# ─── 8. Save model ─────────────────────────────────────────────────────────────
MODEL_DIR = 'model'
os.makedirs(MODEL_DIR, exist_ok=True)

# Save label mapping first (always succeeds)
labels_path = os.path.join(MODEL_DIR, 'labels.json')
with open(labels_path, 'w') as f:
    json.dump(labels, f, indent=2)
print(f"\nLabels saved to {labels_path}")

# Try TensorFlow.js export first, fall back to keras SavedModel
try:
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, MODEL_DIR)
    print(f"Model saved to {MODEL_DIR}/ (TensorFlow.js format — browser-ready)")
except ImportError:
    # Save Keras native format for later manual conversion
    keras_path = os.path.join(MODEL_DIR, 'gesture_model.keras')
    model.save(keras_path)
    print(f"TensorFlow.js not installed. Model saved as Keras format: {keras_path}")
    print("To convert later: tensorflowjs_converter --input_format=keras gesture_model.keras ./model")

print(f"\n{'='*50}")
print(f"  Samples used  : {len(y)}")
print(f"  Train acc     : {train_acc * 100:.2f}%")
print(f"  Val acc       : {val_acc   * 100:.2f}%")
print(f"  Model output  : {os.path.abspath(MODEL_DIR)}")
print(f"  Labels        : {labels}")
print(f"{'='*50}")

# AI & Gesture Recognition Module Architecture

This folder contains the architectural blueprint and ML interfaces for **ISL AI Translator**.

## System Overview

```
 [ Webcam Feed ]
        │
        ▼
[ MediaPipe Hands ] ── (Extracts 21 3D Landmark Points per hand: x, y, z)
        │
        ▼
[ Feature Normalization ] ── (Origin centering & Wrist-to-Middle Finger scaling)
        │
        ▼
[ ML Gesture Classifier ] ── (TensorFlow.js Model / Neural Net Classifier)
        │
        ▼
[ Confidence & Suggestion Filter ] ── (Threshold check: >= 75%)
        │
        ▼
[ Output: English Text / Tamil Text / Speech ]
```

## Planned AI Components

1. **Landmark Extraction Service** (`ai/landmarks/handTracker.js`):
   - Initializes MediaPipe Hands solution.
   - Captures frame stream from `<video>` element.
   - Computes 21 spatial joints per hand $(x_i, y_i, z_i)$.

2. **Feature Vector Normalizer** (`ai/utils/normalize.js`):
   - Subtracts wrist landmark $(x_0, y_0, z_0)$ from all points to achieve translation invariance.
   - Normalizes vector scale based on hand size to achieve distance/scale invariance.

3. **Gesture Classifier Engine** (`ai/model/classifier.js`):
   - Accepts normalized 63-dimensional landmark array $(21 \times 3)$.
   - Outputs predicted ISL sign token + probability vector.
   - Supports easy plug-and-play swapping of trained TensorFlow.js Keras/Custom Models without altering frontend UI.

4. **Dynamic Gesture Windowing**:
   - Sliding time window (5-10 frames) for continuous ISL sign sequence stabilization.

## ML Training Pipeline

The first real trained ML model for the ISL AI Translator was created using a collected dataset of MediaPipe hand landmarks.

1. **Dataset**: A JSON dataset (dataset/gesture.json) contains captured MediaPipe 21-landmark (x,y,z) points.
2. **MediaPipe Landmarks**: Hand landmarks are extracted from the dataset, ensuring the data is flattened into a 63-dimensional feature array (21 points x 3 axes).
3. **ML Training**: A simple feedforward neural network is built using TensorFlow/Keras. The dataset is split into training (80%) and validation (20%) sets. The model is trained to recognize the different gesture classes (e.g., Water and Stop).
4. **TensorFlow.js Model**: The trained Keras model is converted and exported directly into a browser-compatible TensorFlow.js format under i/model/. This model can be loaded directly on the frontend for real-time inference without needing a Python backend.

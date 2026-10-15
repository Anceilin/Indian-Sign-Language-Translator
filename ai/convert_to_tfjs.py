"""
convert_to_tfjs.py
==================
Manually exports the trained Keras model to TensorFlow.js (Layers API) format
without requiring the full `tensorflowjs` package with its heavy dependencies.

Produces:
  ai/model/tfjs/model.json    — model topology + weight manifest
  ai/model/tfjs/group1-shard1of1.bin  — binary weights

This format can be loaded directly in the browser with:
  const model = await tf.loadLayersModel('/path/to/model.json');
"""

import json
import numpy as np
import tensorflow as tf
import os
import struct
import base64

MODEL_KERAS = 'model/gesture_model.keras'
TFJS_DIR    = 'model/tfjs'
os.makedirs(TFJS_DIR, exist_ok=True)

# Load saved Keras model
model = tf.keras.models.load_model(MODEL_KERAS)
print(f"Loaded model from {MODEL_KERAS}")

# ─── Collect weights ────────────────────────────────────────────────────────────
weights_manifest_entries = []
all_weights_bytes = bytearray()

for w in model.weights:
    arr = w.numpy().astype(np.float32)
    raw = arr.tobytes()
    byte_offset = len(all_weights_bytes)
    all_weights_bytes.extend(raw)

    shape = list(arr.shape)
    size_bytes = len(raw)

    weights_manifest_entries.append({
        "name": getattr(w, 'path', w.name),
        "shape": shape,
        "dtype": "float32"
    })

# Write binary shard
shard_filename = "group1-shard1of1.bin"
shard_path = os.path.join(TFJS_DIR, shard_filename)
with open(shard_path, 'wb') as f:
    f.write(all_weights_bytes)
print(f"Weights binary written to {shard_path} ({len(all_weights_bytes)} bytes)")

# ─── Build model topology (TFJS Layers format) ─────────────────────────────────
model_config = model.get_config()

# Fix InputLayer batch_shape for TFJS compatibility (Keras 3 changes batch_input_shape to batch_shape)
if "layers" in model_config:
    for layer in model_config["layers"]:
        if layer.get("class_name") == "InputLayer":
            config = layer.get("config", {})
            if "batch_shape" in config:
                config["batch_input_shape"] = config.pop("batch_shape")

backend_type = model_config.get('class_name', 'Sequential')

topology = {
    "class_name": "Sequential",
    "config": model_config,
    "keras_version": "2.21.0",
    "backend": "tensorflow"
}

model_json = {
    "modelTopology": topology,
    "format": "layers-model",
    "generatedBy": "ISL AI Trainer (custom export)",
    "convertedBy": None,
    "weightsManifest": [
        {
            "paths": [shard_filename],
            "weights": weights_manifest_entries
        }
    ]
}

model_json_path = os.path.join(TFJS_DIR, 'model.json')
with open(model_json_path, 'w') as f:
    json.dump(model_json, f, indent=2)

print(f"model.json written to {model_json_path}")
print(f"\nTensorFlow.js model ready at: {os.path.abspath(TFJS_DIR)}/")
print(f"  {os.path.join(TFJS_DIR, 'model.json')}")
print(f"  {shard_path}")
print("\nTo load in browser:")
print("  const model = await tf.loadLayersModel('/ai/model/tfjs/model.json');")

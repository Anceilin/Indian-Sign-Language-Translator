import * as tf from '@tensorflow/tfjs';
import { TAMIL_TRANSLATIONS } from './gestureClassifier';

class MLClassifier {
  constructor() {
    this.model = null;
    this.labels = [];
    this.isReady = false;
  }

  async loadModel() {
    try {
      await tf.ready();
      const baseUrl = import.meta.env.BASE_URL || '/';
      const modelUrl = `${baseUrl}model/tfjs/model.json`;
      const labelsUrl = `${baseUrl}model/labels.json`;
      
      this.model = await tf.loadLayersModel(modelUrl);
      
      const response = await fetch(labelsUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.labels = await response.json();
      
      this.isReady = true;
      console.log('ML Model loaded successfully:', this.labels);
      return true;
    } catch (error) {
      console.error('Failed to load ML model:', error);
      this.isReady = false;
      return false;
    }
  }

  // Exact same normalization from DatasetCollector
  normalizeHandLandmarks(landmarks) {
    if (!landmarks || landmarks.length === 0) return [];
    
    // 1. Wrist centered (wrist is landmarks[0])
    const wristX = landmarks[0].x;
    const wristY = landmarks[0].y;
    const wristZ = landmarks[0].z;

    let centered = landmarks.map(pt => ({
      x: pt.x - wristX,
      y: pt.y - wristY,
      z: pt.z - wristZ
    }));

    // 2. Scale invariant (find max absolute value to scale coordinates between -1 and 1)
    let maxVal = 0;
    centered.forEach(pt => {
      maxVal = Math.max(maxVal, Math.abs(pt.x), Math.abs(pt.y), Math.abs(pt.z));
    });

    if (maxVal === 0) maxVal = 1; // Prevent division by zero

    return centered.map(pt => ({
      x: Number((pt.x / maxVal).toFixed(4)),
      y: Number((pt.y / maxVal).toFixed(4)),
      z: Number((pt.z / maxVal).toFixed(4))
    }));
  }

  predict(multiHandLandmarks) {
    if (!this.isReady || !multiHandLandmarks || multiHandLandmarks.length === 0) {
      return null;
    }

    // Only process first hand for ML model (Stop and Water are single hand gestures)
    const hand = this.normalizeHandLandmarks(multiHandLandmarks[0]);
    if (hand.length !== 21) return null;

    // Flatten into 63-dim vector
    const features = new Float32Array(63);
    for (let i = 0; i < 21; i++) {
      features[i * 3 + 0] = hand[i].x;
      features[i * 3 + 1] = hand[i].y;
      features[i * 3 + 2] = hand[i].z;
    }

    // Predict
    const inputTensor = tf.tensor2d([features], [1, 63]);
    const outputTensor = this.model.predict(inputTensor);
    const probs = outputTensor.dataSync();
    
    inputTensor.dispose();
    outputTensor.dispose();

    let maxProb = 0;
    let maxIdx = -1;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }

    const label = this.labels[maxIdx];
    const confidence = Math.round(maxProb * 100);

    // Only return if confident enough
    if (confidence > 80) {
      const groupName = label.toUpperCase() + '_GROUP';
      const keyName = label.toUpperCase();
      return {
        key: keyName,
        handShapeGroup: groupName,
        label: label.toUpperCase(),
        englishLabel: label,
        tamilLabel: TAMIL_TRANSLATIONS[label] || label,
        english: label,
        tamil: TAMIL_TRANSLATIONS[label] || label,
        confidence: confidence,
        possibleOptions: [
          { key: keyName, en: label, ta: TAMIL_TRANSLATIONS[label] || label }
        ]
      };
    }

    return null; // Fallback to rule-based
  }
}

export const mlClassifier = new MLClassifier();

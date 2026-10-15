import { useState, useRef, useCallback, useEffect } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

/**
 * Custom React hook for MediaPipe Hand Tracking
 * Detects up to 2 hands in real time, draws landmarks on canvas overlay,
 * and extracts normalized landmark coordinates for future AI classification models.
 */
export function useHandTracker() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('Camera Offline');
  const [numHandsDetected, setNumHandsDetected] = useState(0);
  const [normalizedLandmarks, setNormalizedLandmarks] = useState([]);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize MediaPipe Hands solution
  const initHands = useCallback(() => {
    if (handsRef.current) return handsRef.current;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas dimensions to video feed
      if (videoRef.current && (canvas.width !== videoRef.current.videoWidth || canvas.height !== videoRef.current.videoHeight)) {
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const count = results.multiHandLandmarks.length;
        setNumHandsDetected(count);
        setTrackingStatus(count === 1 ? '1 Hand Detected' : `${count} Hands Detected`);

        const extractedHandLandmarks = [];

        // Draw connections and landmarks for each detected hand
        results.multiHandLandmarks.forEach((landmarks) => {
          // Draw connectors (skeleton lines)
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
            color: '#06b6d4', // Cyan theme
            lineWidth: 3
          });

          // Draw landmark joint dots
          drawLandmarks(ctx, landmarks, {
            color: '#ec4899', // Pink theme for joints
            fillColor: '#38bdf8', // Light blue center
            lineWidth: 1.5,
            radius: 4
          });

          // Extract normalized (x, y, z) coordinates for AI engine consumption
          extractedHandLandmarks.push(
            landmarks.map((pt) => ({
              x: Number(pt.x.toFixed(4)),
              y: Number(pt.y.toFixed(4)),
              z: Number(pt.z.toFixed(4))
            }))
          );
        });

        setNormalizedLandmarks(extractedHandLandmarks);
      } else {
        setNumHandsDetected(0);
        setTrackingStatus('No hand detected');
        setNormalizedLandmarks([]);
      }

      ctx.restore();
    });

    handsRef.current = hands;
    return hands;
  }, []);

  // Frame processing loop using requestAnimationFrame
  const processFrame = useCallback(async () => {
    if (
      videoRef.current &&
      videoRef.current.readyState >= 2 &&
      handsRef.current
    ) {
      try {
        await handsRef.current.send({ image: videoRef.current });
      } catch (err) {
        console.error('MediaPipe frame processing error:', err);
      }
    }
    if (streamRef.current) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    }
  }, []);

  // Start webcam feed and hand landmarker
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setTrackingStatus('Initializing Camera...');

    try {
      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe Hands
      const hands = initHands();

      setIsCameraActive(true);
      setTrackingStatus('Searching for Hand...');

      // Start processing frames
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Camera Permission / Access Error:', err);
      setIsCameraActive(false);
      setTrackingStatus('Camera Access Error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Webcam permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No webcam device found on your system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Webcam is already in use by another application.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access webcam'}`);
      }
    }
  }, [initHands, processFrame]);

  // Stop webcam feed and release resources
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setTrackingStatus('Camera Offline');
    setNumHandsDetected(0);
    setNormalizedLandmarks([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    trackingStatus,
    numHandsDetected,
    normalizedLandmarks,
    cameraError,
    startCamera,
    stopCamera
  };
}

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Play, Square, Download, Trash2 } from 'lucide-react';
import { useHandTracker } from '../hooks/useHandTracker';

const GESTURES = [
  'Hello', 'Namaste', 'Stop', 'Water', 'Yes', 'Good', 'Help', 
  'Peace', 'Victory', 'Letter A', 'Letter B', 'Letter C', 
  'Letter L', 'Five', 'Heart'
];

export default function DatasetCollector() {
  const {
    videoRef,
    canvasRef,
    isCameraActive,
    trackingStatus,
    numHandsDetected,
    normalizedLandmarks,
    cameraError,
    startCamera,
    stopCamera
  } = useHandTracker();

  const [selectedGesture, setSelectedGesture] = useState(GESTURES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [dataset, setDataset] = useState([]);
  const [sampleCount, setSampleCount] = useState(0);

  // Normalization logic
  const normalizeHandLandmarks = (landmarks) => {
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
  };

  useEffect(() => {
    if (!isRecording || normalizedLandmarks.length === 0) return;

    // Collect data per frame
    const timestamp = Date.now();
    let hand1 = [];
    let hand2 = [];

    // For single hand gestures, we just store hand1.
    // For two-hand gestures, we store both if available.
    if (normalizedLandmarks.length > 0) {
      hand1 = normalizeHandLandmarks(normalizedLandmarks[0]);
    }
    if (normalizedLandmarks.length > 1) {
      hand2 = normalizeHandLandmarks(normalizedLandmarks[1]);
    }

    const sample = {
      label: selectedGesture,
      timestamp,
      hand1,
      hand2
    };

    setDataset(prev => [...prev, sample]);
    setSampleCount(prev => prev + 1);

    // Limit collection rate slightly if needed, but for now we just collect every frame.
  }, [normalizedLandmarks, isRecording, selectedGesture]);

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
      setIsRecording(false);
    } else {
      startCamera();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const clearDataset = () => {
    if (window.confirm("Are you sure you want to clear all collected data?")) {
      setDataset([]);
      setSampleCount(0);
    }
  };

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `gesture_dataset_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const downloadCSV = () => {
    if (dataset.length === 0) return;

    // Create CSV header
    let header = "label,timestamp";
    for (let i = 0; i < 21; i++) {
      header += `,h1_x${i},h1_y${i},h1_z${i}`;
    }
    for (let i = 0; i < 21; i++) {
      header += `,h2_x${i},h2_y${i},h2_z${i}`;
    }
    
    let csv = header + "\n";
    
    dataset.forEach(sample => {
      let row = `${sample.label},${sample.timestamp}`;
      
      // Hand 1
      for (let i = 0; i < 21; i++) {
        if (sample.hand1 && sample.hand1[i]) {
          row += `,${sample.hand1[i].x},${sample.hand1[i].y},${sample.hand1[i].z}`;
        } else {
          row += `,0,0,0`; // Padding if no hand
        }
      }
      
      // Hand 2
      for (let i = 0; i < 21; i++) {
        if (sample.hand2 && sample.hand2[i]) {
          row += `,${sample.hand2[i].x},${sample.hand2[i].y},${sample.hand2[i].z}`;
        } else {
          row += `,0,0,0`; // Padding if no second hand
        }
      }
      
      csv += row + "\n";
    });

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `gesture_dataset_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const samplesByGesture = GESTURES.reduce((acc, gesture) => {
    acc[gesture] = dataset.filter(d => d.label === gesture).length;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <Camera className="w-7 h-7 text-cyan-400" />
            <span>Dataset Collector (Developer)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Collect normalized MediaPipe hand landmarks for ML training.
          </p>
        </div>
      </div>

      {cameraError && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 shadow-lg">
          <div className="space-y-1">
            <span className="font-bold block">Camera Error</span>
            <p className="text-xs text-rose-300">{cameraError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${isCameraActive ? 'block' : 'hidden'}`}
            />
            
            {isCameraActive && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border text-xs font-semibold shadow-md ${numHandsDetected > 0 ? 'border-emerald-500/40 text-emerald-400' : 'border-slate-800 text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${numHandsDetected > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  {trackingStatus}
                </span>
                {isRecording && (
                  <span className="px-3 py-1.5 rounded-full bg-rose-950/90 border border-rose-500/40 text-rose-400 text-xs font-bold shadow-md animate-pulse">
                    RECORDING
                  </span>
                )}
              </div>
            )}
            
            {!isCameraActive && (
              <div className="text-center space-y-3 p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-300">Webcam Inactive</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Start camera to collect dataset.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-cyan-500/30 text-slate-300 text-sm shadow-md">
            <h3 className="font-bold text-cyan-400 mb-2">Instructions for Collection:</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Ensure good lighting and a clear background.</li>
              <li>Select the correct gesture label from the dropdown before recording.</li>
              <li>Show the gesture clearly in the camera frame.</li>
              <li>For two-handed gestures like Namaste and Heart, use both hands.</li>
              <li>Press <strong>Start Recording</strong> to begin capturing frames. Move your hand slightly to capture variations.</li>
              <li>Press <strong>Stop Recording</strong> when you've captured enough samples.</li>
              <li>Aim for at least <strong>200 samples</strong> per gesture.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <button
              onClick={toggleCamera}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                isCameraActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {isCameraActive ? <><CameraOff className="w-4 h-4" /> Stop Camera</> : <><Camera className="w-4 h-4" /> Start Camera</>}
            </button>
            
            <button
              onClick={toggleRecording}
              disabled={!isCameraActive || numHandsDetected === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                isRecording
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'
              }`}
            >
              {isRecording ? <><Square className="w-4 h-4" /> Stop Recording</> : <><Play className="w-4 h-4" /> Start Recording</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6 shadow-xl">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Gesture Label
              </label>
              <select
                value={selectedGesture}
                onChange={(e) => setSelectedGesture(e.target.value)}
                disabled={isRecording}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                {GESTURES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Collection Status</span>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-3xl font-black text-cyan-400">{sampleCount}</span>
                <p className="text-xs text-slate-400 mt-1">Total Samples Collected</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Samples by Gesture (Target: 200)</span>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                {GESTURES.map(g => (
                  <div key={g} className="flex justify-between text-xs py-1 border-b border-slate-800/50">
                    <span className="text-slate-300">{g}</span>
                    <span className={samplesByGesture[g] >= 200 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {samplesByGesture[g]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={downloadJSON}
                disabled={dataset.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all"
              >
                <Download className="w-4 h-4 text-cyan-400" /> JSON
              </button>
              <button
                onClick={downloadCSV}
                disabled={dataset.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all"
              >
                <Download className="w-4 h-4 text-emerald-400" /> CSV
              </button>
              <button
                onClick={clearDataset}
                disabled={dataset.length === 0}
                className="flex items-center justify-center p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500 disabled:opacity-40 text-slate-400 hover:text-rose-400 transition-all"
                title="Clear Dataset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

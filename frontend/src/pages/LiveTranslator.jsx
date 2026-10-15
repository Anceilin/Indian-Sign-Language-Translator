import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Volume2, Trash2, Globe, Sparkles, AlertTriangle, Pause, Play, Delete, Plus, Save } from 'lucide-react';
import { useHandTracker } from '../hooks/useHandTracker';
import { classifyGesture, TAMIL_TRANSLATIONS } from '../services/ai/gestureClassifier';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function LiveTranslator() {
  const [targetLanguage, setTargetLanguage] = useState('en'); // 'en' | 'ta'
  const [isPaused, setIsPaused] = useState(false);
  const [sentenceWords, setSentenceWords] = useState([]);
  const [speechStatus, setSpeechStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [unclearMessage, setUnclearMessage] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);

  const { token } = useAuth();


  const [stablePrediction, setStablePrediction] = useState({
    key: 'NONE',
    handShapeGroup: 'NONE',
    label: '—',
    englishLabel: 'No Hand Detected',
    tamilLabel: 'சைகை கண்டறியப்படவில்லை',
    english: '',
    tamil: '',
    confidence: 0
  });

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

  const predictionHistoryRef = useRef([]);
  const wristHistoryRef = useRef([]);
  const lastCommittedGestureRef = useRef('');
  const committedHandShapeGroupRef = useRef('');
  const recognitionStateRef = useRef('DETECTING'); // 'DETECTING' | 'WAITING_FOR_SELECTION' | 'WAIT_FOR_GESTURE_CHANGE'
  const noHandCounterRef = useRef(0);

  // Load SpeechSynthesis voices — initial load + voiceschanged event (voices may load late)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Frame Prediction Smoothing & Zero-Auto-Commit Recognition Flow
  useEffect(() => {
    if (!isCameraActive || isPaused || normalizedLandmarks.length === 0) {
      if (!isCameraActive) {
        setStablePrediction({
          key: 'NONE',
          handShapeGroup: 'NONE',
          label: '—',
          englishLabel: 'Camera Offline',
          tamilLabel: 'கேமரா முடங்கியுள்ளது',
          english: 'Camera offline. Click "Start Camera" to begin.',
          tamil: 'கேமரா முடங்கியுள்ளது. "Start Camera" சொடுக்கவும்.',
          confidence: 0
        });
        predictionHistoryRef.current = [];
        wristHistoryRef.current = [];
        lastCommittedGestureRef.current = '';
        committedHandShapeGroupRef.current = '';
        recognitionStateRef.current = 'DETECTING';
        noHandCounterRef.current = 0;
        setUnclearMessage('');
        setPendingConfirmation(null);
      }
      return;
    }

    // Extract raw wrist landmark for movement tracking across frames
    if (normalizedLandmarks[0] && normalizedLandmarks[0][0]) {
      const wrist = normalizedLandmarks[0][0];
      const wristHistory = wristHistoryRef.current;
      wristHistory.push({ x: wrist.x, y: wrist.y, t: Date.now() });
      if (wristHistory.length > 10) wristHistory.shift();
    }

    let rawResult = classifyGesture(normalizedLandmarks, wristHistoryRef.current);

    const history = predictionHistoryRef.current;
    history.push(rawResult);
    if (history.length > 10) history.shift();

    const counts = {};
    let totalConf = 0;
    history.forEach((res) => {
      counts[res.key] = (counts[res.key] || 0) + 1;
      totalConf += res.confidence;
    });

    let majorityKey = rawResult.key;
    let maxCount = 0;
    Object.keys(counts).forEach((key) => {
      if (counts[key] > maxCount) {
        maxCount = counts[key];
        majorityKey = key;
      }
    });

    const majoritySample = history.find((res) => res.key === majorityKey) || rawResult;
    const avgConfidence = Math.round(totalConf / history.length);

    const smoothed = {
      ...majoritySample,
      confidence: avgConfidence,
      // Always use possibleOptions from the current live frame (rawResult), not from a
      // stale history entry. The majority vote stabilises the key/label, but the options
      // panel must reflect what the *current* classifier actually returned this frame.
      possibleOptions: rawResult.possibleOptions
    };

    setStablePrediction(smoothed);

    // Track missing hand frames to reset state machine when hand is removed
    if (smoothed.key === 'NONE') {
      noHandCounterRef.current += 1;
      if (noHandCounterRef.current >= 5) {
        lastCommittedGestureRef.current = '';
        committedHandShapeGroupRef.current = '';
        recognitionStateRef.current = 'DETECTING';
        setPendingConfirmation(null);
        setUnclearMessage('');
      }
      return;
    } else {
      noHandCounterRef.current = 0;
    }

    // --- ZERO AUTOMATIC COMMIT RECOGNITION STATE MACHINE ---

    // State 1: WAIT_FOR_GESTURE_CHANGE
    // Ignore frame completely while user is still holding the same physical hand shape
    if (recognitionStateRef.current === 'WAIT_FOR_GESTURE_CHANGE') {
      if (smoothed.handShapeGroup === committedHandShapeGroupRef.current) {
        return; // Hand shape hasn't changed -> ignore completely!
      } else if (smoothed.handShapeGroup !== 'NONE' && smoothed.handShapeGroup !== 'DYNAMIC') {
        // User changed to a NEW physical gesture shape!
        recognitionStateRef.current = 'DETECTING';
      }
    }

    // State 2: WAITING_FOR_SELECTION
    // Keep selection panel visible, NEVER auto-commit anything!
    if (recognitionStateRef.current === 'WAITING_FOR_SELECTION' || pendingConfirmation !== null) {
      return;
    }

    // State 3: DETECTING
    // Show Possible Gestures panel for every valid detected gesture. DO NOT auto-commit!
    if (smoothed.key !== 'NONE' && smoothed.key !== 'DYNAMIC' && smoothed.english) {
      setUnclearMessage('');

      const options =
        smoothed.possibleOptions && smoothed.possibleOptions.length > 0
          ? smoothed.possibleOptions
          : [
              { key: smoothed.key, en: smoothed.english, ta: TAMIL_TRANSLATIONS[smoothed.english] || smoothed.tamil },
              { key: 'HELP', en: 'Help', ta: TAMIL_TRANSLATIONS['Help'] }
            ];

      recognitionStateRef.current = 'WAITING_FOR_SELECTION';
      setPendingConfirmation({
        confidence: smoothed.confidence,
        handShapeGroup: smoothed.handShapeGroup,
        options: options
      });
    }
    // Low Confidence (< 50%) -> Show "Gesture not recognized. Please show the gesture clearly."
    else if (smoothed.confidence < 50 && smoothed.confidence > 0) {
      if (targetLanguage === 'ta') {
        setUnclearMessage('சைகை கண்டறியப்படவில்லை. சைகையை தெளிவாகக் காட்டவும்.');
      } else {
        setUnclearMessage('Gesture not recognized. Please show the gesture clearly.');
      }
    }
  }, [isCameraActive, isPaused, normalizedLandmarks, targetLanguage, pendingConfirmation]);

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
      lastCommittedGestureRef.current = '';
      committedHandShapeGroupRef.current = '';
      recognitionStateRef.current = 'DETECTING';
      noHandCounterRef.current = 0;
      setPendingConfirmation(null);
      setUnclearMessage('');
    } else {
      startCamera();
    }
  };

  const handleAddWord = () => {
    if (stablePrediction.english && stablePrediction.key !== 'NONE' && stablePrediction.key !== 'DYNAMIC') {
      const tamilWord = TAMIL_TRANSLATIONS[stablePrediction.english] || stablePrediction.tamil;
      setSentenceWords((prev) => [
        ...prev,
        {
          id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          key: stablePrediction.key,
          en: stablePrediction.english,
          ta: tamilWord
        }
      ]);
      lastCommittedGestureRef.current = stablePrediction.key;
      committedHandShapeGroupRef.current = stablePrediction.handShapeGroup;
      recognitionStateRef.current = 'WAIT_FOR_GESTURE_CHANGE';
      setPendingConfirmation(null);
      setUnclearMessage('');
    }
  };

  // EXPLICIT USER CLICK: Exactly ONE way to commit a gesture from candidate selection panel
  const handleSelectGestureOption = (option) => {
    if (!pendingConfirmation) return;

    const group = pendingConfirmation.handShapeGroup || stablePrediction.handShapeGroup;
    const tamilWord = TAMIL_TRANSLATIONS[option.en] || option.ta;

    setSentenceWords((prev) => [
      ...prev,
      {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        key: option.key,
        en: option.en,
        ta: tamilWord
      }
    ]);
    lastCommittedGestureRef.current = option.key;
    committedHandShapeGroupRef.current = group;
    recognitionStateRef.current = 'WAIT_FOR_GESTURE_CHANGE';
    setPendingConfirmation(null);
    setUnclearMessage('');
  };

  const handleBackspace = () => {
    setSentenceWords((prev) => prev.slice(0, -1));
    lastCommittedGestureRef.current = '';
  };

  const handleClearSentence = () => {
    setSentenceWords([]);
    lastCommittedGestureRef.current = '';
    committedHandShapeGroupRef.current = '';
    recognitionStateRef.current = 'DETECTING';
    setPendingConfirmation(null);
    setUnclearMessage('');
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Format constructed sentence as normal readable text: "Hello, Water, Yes" / "வணக்கம், தண்ணீர், ஆம்"
  const fullSentenceText = sentenceWords
    .map((w, idx) => {
      const text = targetLanguage === 'en' ? w.en : (TAMIL_TRANSLATIONS[w.en] || w.ta);
      return idx < sentenceWords.length - 1 ? `${text},` : text;
    })
    .join(' ');

  // Text-to-Speech handling
  // Tamil: proxied through backend → Google Translate TTS (free, no API key)
  // English: Web Speech API (works in all browsers natively)
  const handleTextToSpeech = async () => {
    const rawSentence = sentenceWords
      .map((w) => (targetLanguage === 'en' ? w.en : (TAMIL_TRANSLATIONS[w.en] || w.ta)))
      .join(' ');

    const textToSpeak =
      rawSentence ||
      (targetLanguage === 'en'
        ? stablePrediction.english
        : TAMIL_TRANSLATIONS[stablePrediction.english] || stablePrediction.tamil);

    if (!textToSpeak) return;

    if (targetLanguage === 'ta') {
      // Tamil TTS via backend proxy → Google Translate TTS (no API key, free)
      setSpeechStatus('Loading Tamil audio...');
      try {
        const params = new URLSearchParams({ text: textToSpeak, lang: 'ta' });
        const response = await fetch(`${API_BASE_URL}/tts?${params}`);

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        audio.onplay = () => setSpeechStatus('▶ Playing Tamil speech...');
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setTimeout(() => setSpeechStatus(''), 3000);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          setSpeechStatus('Could not play Tamil audio.');
          setTimeout(() => setSpeechStatus(''), 4000);
        };

        await audio.play();
      } catch (err) {
        console.error('Tamil TTS error:', err);
        setSpeechStatus('Tamil audio failed. Is the backend running?');
        setTimeout(() => setSpeechStatus(''), 5000);
      }

    } else {
      // English TTS — Web Speech API (reliable in all browsers for English)
      if (!('speechSynthesis' in window)) {
        setSpeechStatus('Text-to-Speech not supported on this browser.');
        return;
      }

      window.speechSynthesis.cancel();

      const voices = window.speechSynthesis.getVoices();
      const freshVoices = voices.length > 0 ? voices : availableVoices;
      const englishVoice = freshVoices.find(
        (v) => v.lang.toLowerCase().startsWith('en-us') || v.lang.toLowerCase().startsWith('en')
      );

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        if (englishVoice) utterance.voice = englishVoice;

        const voiceName = englishVoice ? englishVoice.name : 'Browser default English';
        setSpeechStatus(`▶ Playing English speech (${voiceName})`);
        utterance.onend = () => setTimeout(() => setSpeechStatus(''), 3000);
        window.speechSynthesis.speak(utterance);
      }, 80);
    }
  };


  // Save Translation to backend API
  const handleSaveTranslation = async () => {
    const rawSentence = sentenceWords
      .map((w) => (targetLanguage === 'en' ? w.en : (TAMIL_TRANSLATIONS[w.en] || w.ta)))
      .join(' ');

    const textToSave =
      fullSentenceText ||
      rawSentence ||
      (targetLanguage === 'en'
        ? stablePrediction.english
        : TAMIL_TRANSLATIONS[stablePrediction.english] || stablePrediction.tamil);

    if (!textToSave) return;

    if (!token) {
      setSaveStatus('Please log in to save translations to your account.');
      setTimeout(() => setSaveStatus(''), 4000);
      return;
    }

    try {
      setSaveStatus('Saving translation...');
      const signLabel =
        targetLanguage === 'en'
          ? stablePrediction.englishLabel
          : TAMIL_TRANSLATIONS[stablePrediction.english] || stablePrediction.tamilLabel;

      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sign: signLabel,
          sentence: textToSave,
          language: targetLanguage,
          confidence: stablePrediction.confidence || 90,
          mode: 'Live Webcam'
        })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSaveStatus('Translation saved to history!');
        setTimeout(() => setSaveStatus(''), 3500);
      } else {
        setSaveStatus(`Failed to save: ${data.message}`);
      }
    } catch (err) {
      console.error('Save translation error:', err);
      setSaveStatus('Error saving translation to server.');
    }
  };

  // Active gesture display name strictly in selected language
  const activeGestureDisplay =
    targetLanguage === 'en'
      ? stablePrediction.englishLabel || stablePrediction.label
      : TAMIL_TRANSLATIONS[stablePrediction.english] || stablePrediction.tamilLabel || stablePrediction.tamil || stablePrediction.label;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <Camera className="w-7 h-7 text-cyan-400" />
            <span>Live ISL AI Gesture Translator</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time hand tracking, continuous sign translation, and audio speech synthesis.
          </p>
        </div>

        {/* Language Selection & ML Status */}
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTargetLanguage('en')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  targetLanguage === 'en'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>English</span>
              </button>
              <button
                onClick={() => setTargetLanguage('ta')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  targetLanguage === 'ta'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>தமிழ் (Tamil)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Error Banner */}
      {cameraError && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Camera Permission / Access Error</span>
            <p className="text-xs text-rose-300">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Camera Viewport (7 cols) + Sentence Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Webcam Viewport Container */}
          <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl group">
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

            {/* Status Overlay Badges */}
            {isCameraActive && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border text-xs font-semibold shadow-md ${
                    numHandsDetected > 0
                      ? 'border-emerald-500/40 text-emerald-400'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      numHandsDetected > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  ></span>
                  {trackingStatus}
                </span>

                {isPaused && (
                  <span className="px-3 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-400 text-xs font-bold shadow-md">
                    PAUSED
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
                    Click "Start Camera" to initialize continuous MediaPipe AI gesture translation.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleCamera}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                  isCameraActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    <span>Stop Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Start Camera</span>
                  </>
                )}
              </button>

              {isCameraActive && (
                <button
                  onClick={togglePause}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    isPaused
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              )}
            </div>

            {/* Sentence Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddWord}
                disabled={!isCameraActive || stablePrediction.key === 'NONE'}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
                title="Add current gesture word to sentence"
              >
                <Plus className="w-4 h-4" />
                <span>Add Word</span>
              </button>

              <button
                onClick={handleBackspace}
                disabled={sentenceWords.length === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold transition-colors"
                title="Remove last word"
              >
                <Delete className="w-4 h-4 text-amber-400" />
                <span>Backspace</span>
              </button>

              <button
                onClick={handleClearSentence}
                disabled={sentenceWords.length === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors"
                title="Clear full sentence"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Continuous Sentence Output, Selection Panel & Audio Speech (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Continuous Translation</span>
              </h2>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                {targetLanguage === 'en' ? 'English Output' : 'தமிழ் வெளியீடு'}
              </span>
            </div>

            {/* Current Gesture Live Prediction */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {targetLanguage === 'en' ? 'Active Gesture' : 'தற்போதைய சைகை'}
              </span>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-lg font-black text-cyan-400 tracking-wide uppercase">
                  {activeGestureDisplay}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    stablePrediction.confidence >= 85
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : stablePrediction.confidence >= 50
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {stablePrediction.confidence}% Conf.
                </span>
              </div>
            </div>

            {/* POSSIBLE GESTURES Selection Panel - Requires Explicit User Click */}
            {pendingConfirmation && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-3 shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between text-xs border-b border-amber-500/20 pb-2">
                  <span className="font-extrabold text-amber-400 uppercase tracking-wider text-xs">
                    {targetLanguage === 'en' ? 'POSSIBLE GESTURES' : 'சாத்தியமான சைகைகள்'}
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px]">
                    {pendingConfirmation.confidence}% Confidence
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium">
                  {targetLanguage === 'en'
                    ? 'Select the gesture that you intended:'
                    : 'நீங்கள் உத்தேசித்த சைகையைத் தேர்ந்தெடுக்கவும்:'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {pendingConfirmation.options.map((opt) => {
                    const label = targetLanguage === 'en' ? opt.en : (TAMIL_TRANSLATIONS[opt.en] || opt.ta);
                    return (
                      <button
                        key={opt.key + '-' + opt.en}
                        onClick={() => handleSelectGestureOption(opt)}
                        className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex-1 min-w-[90px] text-center uppercase tracking-wide hover:scale-105"
                      >
                        [ {label} ]
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Low Confidence / Unclear Gesture Message */}
            {unclearMessage && !pendingConfirmation && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{unclearMessage}</span>
              </div>
            )}

            {/* Constructed Sentence Box - Formatted as Normal Readable Text */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-400">
                  {targetLanguage === 'en' ? 'Constructed Sentence' : 'உருவாக்கப்பட்ட வாக்கியம்'}
                </span>
                <span className="text-slate-500">{sentenceWords.length} {targetLanguage === 'en' ? 'words' : 'சொற்கள்'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 min-h-[100px] flex items-start">
                {sentenceWords.length > 0 ? (
                  <p className="text-base font-semibold text-slate-100 leading-relaxed tracking-wide">
                    "{fullSentenceText}"
                  </p>
                ) : (
                  <p className="text-slate-500 italic font-normal text-sm">
                    {targetLanguage === 'en'
                      ? 'Continuous gestures will build a sentence here...'
                      : 'சைகைகள் இங்கு வாக்கியமாக உருவாக்கப்படும்...'}
                  </p>
                )}
              </div>
            </div>

            {/* Audio Speech & Save Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleTextToSpeech}
                disabled={sentenceWords.length === 0 && !stablePrediction.english}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
              >
                <Volume2 className="w-4 h-4" />
                <span>Text-to-Speech</span>
              </button>

              <button
                onClick={handleSaveTranslation}
                disabled={sentenceWords.length === 0 && !stablePrediction.english}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save History</span>
              </button>
            </div>

            {speechStatus && (
              <p className={`text-xs italic text-center font-semibold ${speechStatus.includes('not available') ? 'text-amber-400' : 'text-cyan-400'}`}>
                {speechStatus}
              </p>
            )}

            {saveStatus && (
              <p className="text-xs text-emerald-400 font-semibold text-center">{saveStatus}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

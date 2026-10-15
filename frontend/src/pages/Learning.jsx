import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Award, Play, CheckCircle2, XCircle, Camera, CameraOff,
  Sparkles, Check, ChevronLeft, ChevronRight, Search, Filter,
  Eye, RotateCcw, Star, Clock, Zap, Heart, Globe
} from 'lucide-react';
import { useHandTracker } from '../hooks/useHandTracker';
import { classifyGesture } from '../services/ai/gestureClassifier';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/* ─────────────────────────────────────────────
   SIGN DEFINITIONS
   comingSoon: true  → classifier cannot reliably detect yet
────────────────────────────────────────────── */
const ALL_SIGNS = [
  // ── GREETINGS ──────────────────────────────
  {
    id: 'NMS', category: 'greetings',
    name: 'Namaste / Hello',
    english: 'Hello / Welcome / Namaste',
    tamil: 'வணக்கம்',
    difficulty: 'Beginner',
    expectedKeys: ['NAMASTE', 'HELLO'],
    steps: [
      'Face the camera directly.',
      'Bring both open palms together in front of your chest.',
      'Keep fingers pointing upward.',
      'Press palms gently — like a prayer gesture.',
    ],
    tip: 'Both index AND middle fingers must be extended on each hand.',
    comingSoon: false,
  },
  {
    id: 'THU', category: 'greetings',
    name: 'Thumbs Up',
    english: 'Good / Yes / Agree',
    tamil: 'நல்லது / ஆம்',
    difficulty: 'Beginner',
    expectedKeys: ['THUMBS_UP'],
    steps: [
      'Make a fist with your hand.',
      'Extend only your thumb straight upward.',
      'Keep index, middle, ring, and pinky fingers folded into the fist.',
      'Hold the fist upright facing the camera.',
    ],
    tip: 'The thumb tip must be higher than the knuckles.',
    comingSoon: false,
  },
  {
    id: 'HRT', category: 'greetings',
    name: 'Heart',
    english: 'Love / Heart',
    tamil: 'இதயம்',
    difficulty: 'Intermediate',
    expectedKeys: ['HEART'],
    steps: [
      'Use BOTH hands.',
      'Make a fist with each hand, curling all fingers inward.',
      'Extend only the thumbs of both hands upward.',
      'Bring both thumbs close together so their tips touch.',
      'The two thumbs form the top curve of a heart shape.',
    ],
    tip: 'This is a two-hand gesture. Both index and middle fingers must be curled — not extended.',
    comingSoon: false,
  },
  {
    id: 'TNK', category: 'greetings',
    name: 'Thank You',
    english: 'Thank You',
    tamil: 'நன்றி',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Touch your chin or lips with the fingertips of your flat hand.',
      'Move your hand forward and downward.',
      'The gesture is like blowing a kiss forward.',
    ],
    tip: 'This gesture uses movement — the current camera-based classifier does not yet track movement paths for Thank You.',
    comingSoon: true,
  },
  // ── BASIC COMMUNICATION ────────────────────
  {
    id: 'YES', category: 'communication',
    name: 'Yes',
    english: 'Yes / Agree',
    tamil: 'ஆம்',
    difficulty: 'Beginner',
    expectedKeys: ['THUMBS_UP'],
    steps: [
      'Make a fist with your hand.',
      'Extend only your thumb straight upward.',
      'Hold it steady facing the camera.',
    ],
    tip: 'The ISL "Yes" uses the Thumbs Up gesture.',
    comingSoon: false,
  },
  {
    id: 'STP', category: 'communication',
    name: 'Stop',
    english: 'Stop',
    tamil: 'நிறுத்து',
    difficulty: 'Beginner',
    expectedKeys: ['STOP', 'HELLO', 'FIVE'],
    steps: [
      'Open all 5 fingers wide apart.',
      'Hold the palm flat facing the camera — like a traffic stop sign.',
      'Keep your hand still and upright.',
      'Do NOT wave the hand.',
    ],
    tip: 'Stop = open palm, stationary, facing camera. The classifier looks for a still upright open palm.',
    comingSoon: false,
  },
  {
    id: 'HLP', category: 'communication',
    name: 'Help',
    english: 'Help',
    tamil: 'உதவி',
    difficulty: 'Beginner',
    expectedKeys: ['LETTER_A'],
    steps: [
      'Make a tight fist with all fingers folded.',
      'Tuck the thumb alongside the index finger.',
      'Hold the closed fist facing the camera.',
    ],
    tip: 'ISL "Help" uses the closed fist (Letter A) shape.',
    comingSoon: false,
  },
  {
    id: 'GD', category: 'communication',
    name: 'Good',
    english: 'Good / Nice',
    tamil: 'நல்லது',
    difficulty: 'Beginner',
    expectedKeys: ['THUMBS_UP'],
    steps: [
      'Form a fist and extend only the thumb upward.',
      'Keep the hand still in front of the camera.',
    ],
    tip: 'ISL "Good" is expressed with a Thumbs Up gesture.',
    comingSoon: false,
  },
  {
    id: 'SRY', category: 'communication',
    name: 'Sorry',
    english: 'Sorry / Excuse me',
    tamil: 'மன்னிக்கவும்',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Make a fist.',
      'Rub the fist in a circular motion over your chest (heart area).',
    ],
    tip: 'Sorry uses a circular rubbing movement on the chest. Movement-based gestures are not yet supported by the classifier.',
    comingSoon: true,
  },
  {
    id: 'NO', category: 'communication',
    name: 'No',
    english: 'No',
    tamil: 'இல்லை',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Extend your index and middle fingers together.',
      'Tap them against your thumb twice.',
    ],
    tip: 'No requires finger-tap movement — not yet classified by the current static gesture classifier.',
    comingSoon: true,
  },
  // ── COMMON NEEDS ──────────────────────────
  {
    id: 'WTR', category: 'needs',
    name: 'Water',
    english: 'Water',
    tamil: 'தண்ணீர்',
    difficulty: 'Intermediate',
    expectedKeys: ['WATER', 'THREE'],
    steps: [
      'Extend your index, middle, and ring fingers upright.',
      'Keep them together — this is the "W" / Water handshape.',
      'Fold your pinky and thumb down.',
      'Hold it steady facing the camera.',
    ],
    tip: 'Three fingers extended (index, middle, ring). The pinky must be folded down.',
    comingSoon: false,
  },
  {
    id: 'FD', category: 'needs',
    name: 'Food',
    english: 'Food / Eat',
    tamil: 'உணவு',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Bring all fingertips and thumb together (like holding a small ball).',
      'Touch the hand to your lips repeatedly.',
    ],
    tip: 'This gesture requires movement to lips — not yet classified by the current static classifier.',
    comingSoon: true,
  },
  {
    id: 'COM', category: 'needs',
    name: 'Come',
    english: 'Come / Come here',
    tamil: 'வாருங்கள்',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Extend your index finger.',
      'Curl it toward yourself repeatedly.',
    ],
    tip: 'Come uses a repeated curling motion. Movement-path gestures are not yet in the classifier.',
    comingSoon: true,
  },
  {
    id: 'VIC', category: 'needs',
    name: 'Victory / Peace',
    english: 'Victory / Peace / Two',
    tamil: 'வெற்றி / அமைதி',
    difficulty: 'Beginner',
    expectedKeys: ['PEACE'],
    steps: [
      'Extend index and middle fingers upward in a V shape.',
      'Keep ring and pinky fingers folded down.',
      'Thumb can be folded or tucked in.',
    ],
    tip: 'Only index and middle fingers extended. The V-shape must be clear.',
    comingSoon: false,
  },
  // ── ALPHABETS ─────────────────────────────
  {
    id: 'LTA', category: 'alphabets',
    name: 'Letter A',
    english: 'Letter A',
    tamil: 'எழுத்து A',
    difficulty: 'Beginner',
    expectedKeys: ['LETTER_A'],
    steps: [
      'Fold all four fingers into a tight fist.',
      'Rest the thumb flat alongside the side of the index finger.',
      'The thumb should NOT extend upward.',
      'Hold the fist facing the camera.',
    ],
    tip: 'A closed fist with the thumb resting on the side — not pointing up.',
    comingSoon: false,
  },
  {
    id: 'LTB', category: 'alphabets',
    name: 'Letter B',
    english: 'Letter B',
    tamil: 'எழுத்து B',
    difficulty: 'Beginner',
    expectedKeys: ['LETTER_B'],
    steps: [
      'Extend all four fingers (index, middle, ring, pinky) straight upward and close together.',
      'Fold the thumb firmly across the palm.',
      'Keep fingers flat and together.',
    ],
    tip: 'All four fingers up, thumb across the palm. Looks like the flat side of a "B".',
    comingSoon: false,
  },
  {
    id: 'LTC', category: 'alphabets',
    name: 'Letter C',
    english: 'Letter C',
    tamil: 'எழுத்து C',
    difficulty: 'Intermediate',
    expectedKeys: ['LETTER_C'],
    steps: [
      'Curve all fingers and thumb into a C shape.',
      'Leave a gap between thumb tip and index fingertip.',
      'The hand should look like the letter C from the side.',
    ],
    tip: 'Think of holding a cup — the gap between thumb and fingers must be clear.',
    comingSoon: false,
  },
  {
    id: 'LTL', category: 'alphabets',
    name: 'Letter L',
    english: 'Letter L',
    tamil: 'எழுத்து L',
    difficulty: 'Beginner',
    expectedKeys: ['LETTER_L'],
    steps: [
      'Extend your index finger straight upward.',
      'Extend your thumb straight sideways (horizontal).',
      'Keep middle, ring, and pinky fingers folded down.',
      'The index and thumb form a 90° angle like the letter "L".',
    ],
    tip: 'Index up + thumb sideways = L. The other three fingers must be folded.',
    comingSoon: false,
  },
  {
    id: 'LTD', category: 'alphabets',
    name: 'Letter D',
    english: 'Letter D',
    tamil: 'எழுத்து D',
    difficulty: 'Intermediate',
    expectedKeys: [],
    steps: [
      'Touch your index fingertip to your thumb tip, forming a circle.',
      'Extend middle, ring, and pinky fingers upward.',
    ],
    tip: 'Letter D requires pinched index+thumb with other fingers up. Coming soon in the next classifier update.',
    comingSoon: true,
  },
  {
    id: 'LTE', category: 'alphabets',
    name: 'Letter E',
    english: 'Letter E',
    tamil: 'எழுத்து E',
    difficulty: 'Intermediate',
    expectedKeys: [],
    steps: [
      'Curl all fingers downward so fingertips touch the palm.',
      'The thumb is tucked under the fingers.',
    ],
    tip: 'E shape = all fingers curled down. Coming soon in the next classifier update.',
    comingSoon: true,
  },
  {
    id: 'LTF', category: 'alphabets',
    name: 'Letter F',
    english: 'Letter F',
    tamil: 'எழுத்து F',
    difficulty: 'Intermediate',
    expectedKeys: [],
    steps: [
      'Touch the tip of your index finger to the tip of your thumb.',
      'Extend middle, ring, and pinky fingers outward.',
    ],
    tip: 'F = index+thumb pinched, others extended. Coming soon in the next classifier update.',
    comingSoon: true,
  },
  {
    id: 'LTG', category: 'alphabets',
    name: 'Letter G',
    english: 'Letter G',
    tamil: 'எழுத்து G',
    difficulty: 'Intermediate',
    expectedKeys: [],
    steps: [
      'Extend your index finger sideways (horizontal).',
      'Extend your thumb pointing in the same direction.',
      'Keep other fingers folded.',
    ],
    tip: 'G = index and thumb both pointing sideways. Coming soon in the next classifier update.',
    comingSoon: true,
  },
  {
    id: 'LTH', category: 'alphabets',
    name: 'Letter H',
    english: 'Letter H',
    tamil: 'எழுத்து H',
    difficulty: 'Intermediate',
    expectedKeys: [],
    steps: [
      'Extend your index and middle fingers sideways (horizontal) together.',
      'Keep ring, pinky, and thumb folded.',
    ],
    tip: 'H = two fingers horizontal. Coming soon in the next classifier update.',
    comingSoon: true,
  },
  {
    id: 'LTI', category: 'alphabets',
    name: 'Letter I',
    english: 'Letter I',
    tamil: 'எழுத்து I',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Extend only your pinky finger straight upward.',
      'Fold all other fingers including the thumb.',
    ],
    tip: 'I = only pinky extended. Coming soon in the next classifier update.',
    comingSoon: true,
  },
  // ── NUMBERS ───────────────────────────────
  {
    id: 'N1', category: 'numbers',
    name: 'Number 1',
    english: 'One',
    tamil: 'ஒன்று',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Extend only your index finger straight upward.',
      'Fold all other fingers and the thumb into a fist.',
    ],
    tip: 'Isolated index finger. This shape is similar to a pointing gesture — classifier update coming soon.',
    comingSoon: true,
  },
  {
    id: 'N2', category: 'numbers',
    name: 'Number 2',
    english: 'Two',
    tamil: 'இரண்டு',
    difficulty: 'Beginner',
    expectedKeys: ['PEACE'],
    steps: [
      'Extend your index and middle fingers in a V shape.',
      'Fold ring, pinky, and thumb.',
    ],
    tip: 'Number 2 uses the Peace / Victory gesture. Works with the current classifier.',
    comingSoon: false,
  },
  {
    id: 'N3', category: 'numbers',
    name: 'Number 3',
    english: 'Three',
    tamil: 'மூன்று',
    difficulty: 'Beginner',
    expectedKeys: ['WATER', 'THREE'],
    steps: [
      'Extend index, middle, and ring fingers upward.',
      'Fold pinky and thumb.',
    ],
    tip: 'Three fingers up. The classifier detects this as Water/Three — select "Three" from the options panel.',
    comingSoon: false,
  },
  {
    id: 'N4', category: 'numbers',
    name: 'Number 4',
    english: 'Four',
    tamil: 'நான்கு',
    difficulty: 'Beginner',
    expectedKeys: [],
    steps: [
      'Extend all four fingers (index, middle, ring, pinky) upward.',
      'Fold only the thumb across the palm.',
    ],
    tip: 'This is very similar to Letter B. Classifier update for 4 vs B coming soon.',
    comingSoon: true,
  },
  {
    id: 'N5', category: 'numbers',
    name: 'Number 5',
    english: 'Five',
    tamil: 'ஐந்து',
    difficulty: 'Beginner',
    expectedKeys: ['FIVE', 'HELLO', 'STOP'],
    steps: [
      'Open all 5 fingers wide apart.',
      'Keep the palm facing the camera.',
      'Hold still without waving.',
    ],
    tip: 'Five = all 5 fingers open, stationary. The classifier detects it as Five/Hello/Stop — select "Five".',
    comingSoon: false,
  },
  // ── COMMON GESTURES ──────────────────────
  {
    id: 'OPM', category: 'common',
    name: 'Open Palm',
    english: 'Open Palm / Hello / Five',
    tamil: 'திறந்த உள்ளங்கை',
    difficulty: 'Beginner',
    expectedKeys: ['HELLO', 'STOP', 'FIVE'],
    steps: [
      'Spread all 5 fingers open and wide apart.',
      'Face the palm directly toward the camera.',
      'Hold the hand steady in front of you.',
    ],
    tip: 'The classifier groups Hello/Stop/Five under Open Palm. Select whichever you intend.',
    comingSoon: false,
  },
  {
    id: 'HLO', category: 'common',
    name: 'Hello (Wave)',
    english: 'Hello',
    tamil: 'வணக்கம்',
    difficulty: 'Beginner',
    expectedKeys: ['HELLO'],
    steps: [
      'Open all 5 fingers wide apart.',
      'Wave your hand side-to-side in a clear sweeping motion.',
      'The system detects the wave movement to distinguish Hello from Stop.',
    ],
    tip: 'Wave the open palm left and right. Movement is required for "Hello" — not just a still open palm.',
    comingSoon: false,
  },
];

/* ─────────────────────────────────────────────
   SVG GESTURE VISUAL REFERENCE DIAGRAMS
   Each matches the classifier heuristic exactly
────────────────────────────────────────────── */
function GestureVisual({ signId }) {
  const G = ({ children }) => (
    <svg viewBox="0 0 220 180" className="w-full h-full mx-auto">
      <defs>
        <linearGradient id={`gc${signId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="220" height="180" rx="18" fill="#0c1322" />
      {children}
    </svg>
  );
  const fill = `url(#gc${signId})`;
  const palmFill = '#1e2d45';
  const label = (t) => (
    <text x="110" y="172" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{t}</text>
  );

  switch (signId) {
    /* ── Namaste: two open palms joined ── */
    case 'NMS':
      return (
        <G>
          {/* Left palm */}
          <rect x="55" y="28" width="42" height="100" rx="10" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          <rect x="60" y="16" width="9" height="50" rx="5" fill={fill} />
          <rect x="72" y="10" width="9" height="56" rx="5" fill={fill} />
          <rect x="84" y="14" width="9" height="52" rx="5" fill={fill} />
          <rect x="40" y="50" width="9" height="38" rx="5" fill={fill} transform="rotate(20 44 50)" />
          {/* Right palm */}
          <rect x="123" y="28" width="42" height="100" rx="10" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          <rect x="128" y="16" width="9" height="50" rx="5" fill={fill} />
          <rect x="140" y="10" width="9" height="56" rx="5" fill={fill} />
          <rect x="152" y="14" width="9" height="52" rx="5" fill={fill} />
          <rect x="163" y="50" width="9" height="38" rx="5" fill={fill} transform="rotate(-20 168 50)" />
          {/* Center join line */}
          <line x1="110" y1="12" x2="110" y2="132" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
          {label('Both open palms joined facing camera')}
        </G>
      );

    /* ── Thumbs Up ── */
    case 'THU':
    case 'YES':
    case 'GD':
      return (
        <G>
          <rect x="75" y="80" width="70" height="68" rx="16" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          <rect x="78" y="96" width="64" height="2" rx="1" fill="#2d4060" />
          <rect x="78" y="110" width="64" height="2" rx="1" fill="#2d4060" />
          <rect x="78" y="124" width="64" height="2" rx="1" fill="#2d4060" />
          {/* Thumb up */}
          <rect x="88" y="24" width="26" height="62" rx="13" fill={fill} />
          {/* Thumb base attached to fist */}
          <rect x="75" y="78" width="28" height="20" rx="8" fill={fill} />
          {label('Thumb pointing up, fist closed')}
        </G>
      );

    /* ── Heart (two thumbs touching) ── */
    case 'HRT':
      return (
        <G>
          {/* Left hand fist */}
          <rect x="28" y="80" width="58" height="60" rx="14" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          <line x1="28" y1="98" x2="86" y2="98" stroke="#2d4060" strokeWidth="2" />
          <line x1="28" y1="114" x2="86" y2="114" stroke="#2d4060" strokeWidth="2" />
          {/* Left thumb up */}
          <rect x="44" y="24" width="20" height="58" rx="10" fill={fill} />
          {/* Right hand fist */}
          <rect x="134" y="80" width="58" height="60" rx="14" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          <line x1="134" y1="98" x2="192" y2="98" stroke="#2d4060" strokeWidth="2" />
          <line x1="134" y1="114" x2="192" y2="114" stroke="#2d4060" strokeWidth="2" />
          {/* Right thumb up */}
          <rect x="156" y="24" width="20" height="58" rx="10" fill={fill} />
          {/* Touch point highlight */}
          <circle cx="110" cy="26" r="8" fill="#f472b6" opacity="0.85" />
          <text x="110" y="30" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">❤</text>
          {label('Both thumbs extended & touching tips')}
        </G>
      );

    /* ── Stop (open palm, stationary, facing forward) ── */
    case 'STP':
      return (
        <G>
          <rect x="70" y="80" width="80" height="68" rx="16" fill={palmFill} stroke="#38bdf8" strokeWidth="2" />
          <rect x="44" y="52" width="14" height="46" rx="7" fill={fill} transform="rotate(-18 51 65)" />
          <rect x="72" y="18" width="14" height="68" rx="7" fill={fill} />
          <rect x="93" y="12" width="14" height="74" rx="7" fill={fill} />
          <rect x="114" y="18" width="14" height="68" rx="7" fill={fill} />
          <rect x="135" y="30" width="14" height="56" rx="7" fill={fill} />
          {/* STOP label on palm */}
          <text x="110" y="118" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="800">STOP</text>
          {label('Open palm facing camera — STILL, no waving')}
        </G>
      );

    /* ── Help / Letter A / Fist ── */
    case 'HLP':
    case 'LTA':
      return (
        <G>
          <rect x="70" y="50" width="80" height="90" rx="18" fill={palmFill} stroke="#06b6d4" strokeWidth="2.5" />
          <rect x="72" y="70" width="76" height="2" rx="1" fill="#2d4060" />
          <rect x="72" y="88" width="76" height="2" rx="1" fill="#2d4060" />
          <rect x="72" y="106" width="76" height="2" rx="1" fill="#2d4060" />
          {/* Thumb alongside */}
          <rect x="52" y="60" width="24" height="56" rx="12" fill={fill} />
          {label('Closed fist · thumb resting on side')}
        </G>
      );

    /* ── Letter B (4 fingers up, thumb folded across) ── */
    case 'LTB':
      return (
        <G>
          <rect x="65" y="90" width="90" height="56" rx="14" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          {/* 4 fingers */}
          <rect x="72" y="14" width="14" height="80" rx="7" fill={fill} />
          <rect x="90" y="10" width="14" height="84" rx="7" fill={fill} />
          <rect x="108" y="14" width="14" height="80" rx="7" fill={fill} />
          <rect x="126" y="22" width="14" height="72" rx="7" fill={fill} />
          {/* Thumb across palm */}
          <rect x="68" y="92" width="70" height="16" rx="8" fill="#38bdf8" opacity="0.85" />
          <line x1="72" y1="14" x2="72" y2="90" stroke="#1e2d45" strokeWidth="2" />
          <line x1="90" y1="10" x2="90" y2="90" stroke="#1e2d45" strokeWidth="2" />
          <line x1="108" y1="14" x2="108" y2="90" stroke="#1e2d45" strokeWidth="2" />
          {label('4 fingers up · thumb folded across palm')}
        </G>
      );

    /* ── Letter C ── */
    case 'LTC':
      return (
        <G>
          <path d="M 155 38 C 55 38, 55 142, 155 142" fill="none" stroke="#06b6d4" strokeWidth="28" strokeLinecap="round" />
          <path d="M 155 38 C 55 38, 55 142, 155 142" fill="none" stroke="#38bdf8" strokeWidth="14" strokeLinecap="round" />
          <path d="M 155 38 C 55 38, 55 142, 155 142" fill="none" stroke="#0c1322" strokeWidth="4" strokeLinecap="round" />
          {label('Curved hand forming C shape')}
        </G>
      );

    /* ── Letter L (index up + thumb sideways) ── */
    case 'LTL':
      return (
        <G>
          {/* Fist body */}
          <rect x="66" y="80" width="58" height="66" rx="14" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          {/* Index finger up */}
          <rect x="74" y="14" width="16" height="70" rx="8" fill={fill} />
          {/* Thumb sideways */}
          <rect x="80" y="78" width="80" height="16" rx="8" fill={fill} />
          {/* 90° angle indicator */}
          <path d="M 90 78 L 90 66 L 104 66" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
          {label('Index up · Thumb sideways → "L" shape')}
        </G>
      );

    /* ── Victory / Peace / Two ── */
    case 'VIC':
    case 'N2':
      return (
        <G>
          <rect x="75" y="88" width="70" height="60" rx="14" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          {/* Index */}
          <rect x="78" y="20" width="14" height="72" rx="7" fill={fill} />
          {/* Middle */}
          <rect x="96" y="16" width="14" height="76" rx="7" fill="#3b82f6" />
          {label('Index + Middle up · V shape (Peace / 2)')}
        </G>
      );

    /* ── Water / 3 ── */
    case 'WTR':
    case 'N3':
      return (
        <G>
          <rect x="62" y="90" width="96" height="60" rx="14" fill={palmFill} stroke="#06b6d4" strokeWidth="2" />
          {/* Index */}
          <rect x="68" y="18" width="14" height="76" rx="7" fill={fill} />
          {/* Middle */}
          <rect x="87" y="12" width="14" height="82" rx="7" fill="#38bdf8" />
          {/* Ring */}
          <rect x="106" y="18" width="14" height="76" rx="7" fill="#3b82f6" />
          {/* Pinky folded hint */}
          <rect x="124" y="84" width="12" height="36" rx="6" fill="#2d4060" />
          {label('Index + Middle + Ring up (pinky folded)')}
        </G>
      );

    /* ── Open Palm / Hello ── */
    case 'OPM':
    case 'HLO':
      return (
        <G>
          <rect x="62" y="88" width="96" height="62" rx="16" fill={palmFill} stroke="#38bdf8" strokeWidth="2" />
          <rect x="42" y="54" width="13" height="46" rx="7" fill={fill} transform="rotate(-20 48 65)" />
          <rect x="68" y="16" width="13" height="76" rx="7" fill={fill} />
          <rect x="86" y="10" width="13" height="82" rx="7" fill={fill} />
          <rect x="104" y="16" width="13" height="76" rx="7" fill={fill} />
          <rect x="122" y="26" width="13" height="66" rx="7" fill={fill} />
          {signId === 'HLO' && (
            <>
              <path d="M 60 50 Q 50 44 40 50" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
              <path d="M 160 50 Q 170 44 180 50" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
              <text x="32" y="46" fill="#38bdf8" fontSize="10">↔</text>
              <text x="170" y="46" fill="#38bdf8" fontSize="10">↔</text>
            </>
          )}
          {label(signId === 'HLO' ? 'Wave open palm side-to-side' : 'All 5 fingers open · facing camera')}
        </G>
      );

    /* ── Number 5 specific ── */
    case 'N5':
      return (
        <G>
          <rect x="62" y="88" width="96" height="62" rx="16" fill={palmFill} stroke="#38bdf8" strokeWidth="2" />
          <rect x="42" y="54" width="13" height="46" rx="7" fill={fill} transform="rotate(-20 48 65)" />
          <rect x="68" y="16" width="13" height="76" rx="7" fill={fill} />
          <rect x="86" y="10" width="13" height="82" rx="7" fill={fill} />
          <rect x="104" y="16" width="13" height="76" rx="7" fill={fill} />
          <rect x="122" y="26" width="13" height="66" rx="7" fill={fill} />
          <text x="110" y="115" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="800">5</text>
          {label('All 5 fingers spread open')}
        </G>
      );

    /* ── Numbers: still + coming soon placeholders ── */
    case 'N1':
    case 'N4':
    case 'LTD':
    case 'LTE':
    case 'LTF':
    case 'LTG':
    case 'LTH':
    case 'LTI':
    case 'TNK':
    case 'SRY':
    case 'NO':
    case 'FD':
    case 'COM':
      return (
        <G>
          <text x="110" y="80" textAnchor="middle" fill="#38bdf8" fontSize="40">🚧</text>
          <text x="110" y="118" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">Coming Soon</text>
          <text x="110" y="134" textAnchor="middle" fill="#475569" fontSize="9">Classifier update in progress</text>
        </G>
      );

    default:
      return (
        <G>
          <text x="110" y="90" textAnchor="middle" fill="#475569" fontSize="11">Gesture Reference</text>
          {label('Position as instructed below')}
        </G>
      );
  }
}

/* ─────────────────────────────────────────────
   DIFFICULTY BADGE
────────────────────────────────────────────── */
function DiffBadge({ level }) {
  const cls = level === 'Beginner'
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : level === 'Intermediate'
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cls}`}>{level}</span>
  );
}

/* ─────────────────────────────────────────────
   CATEGORY CONFIG
────────────────────────────────────────────── */
const CATEGORIES = {
  en: [
    { id: 'all',           label: 'All Signs',          icon: '✦' },
    { id: 'greetings',     label: 'Greetings',           icon: '👋' },
    { id: 'communication', label: 'Communication',       icon: '💬' },
    { id: 'needs',         label: 'Common Needs',        icon: '🌊' },
    { id: 'alphabets',     label: 'Alphabets',           icon: 'Aa' },
    { id: 'numbers',       label: 'Numbers',             icon: '🔢' },
    { id: 'common',        label: 'Common Gestures',     icon: '✌️' },
  ],
  ta: [
    { id: 'all',           label: 'அனைத்து சைகைகள்',          icon: '✦' },
    { id: 'greetings',     label: 'வாழ்த்துக்கள்',           icon: '👋' },
    { id: 'communication', label: 'தொடர்பு',       icon: '💬' },
    { id: 'needs',         label: 'பொதுவான தேவைகள்',        icon: '🌊' },
    { id: 'alphabets',     label: 'எழுத்துக்கள்',           icon: 'Aa' },
    { id: 'numbers',       label: 'எண்கள்',             icon: '🔢' },
    { id: 'common',        label: 'பொதுவான சைகைகள்',     icon: '✌️' },
  ]
};

const UI_TEXT = {
  en: {
    title: "ISL Learning & Practice",
    subtitle: "Learn a gesture → See the reference → Copy it → Check with the camera.",
    practice: "Practice",
    targetSign: "Target Sign",
    english: "English",
    tamil: "Tamil",
    instructionsTitle: "How to make this gesture",
    startCamera: "Start Camera",
    stopCamera: "Stop Camera",
    checkGesture: "Check Gesture",
    correct: "Correct",
    incorrect: "Incorrect",
    confidence: "Confidence",
    tryAgain: "Try Again",
    nextSign: "Next Sign",
    prevSign: "Previous Sign",
    showMeHow: "Show me how",
    hide: "Hide",
    progress: "Progress",
    selectCategory: "Select Category",
    searchSigns: "Search signs by English, Tamil, or name...",
    attempts: "attempts",
    xp: "XP",
    cameraOff: "Camera is off",
    cameraOffDesc: "Start the camera, copy the gesture shown on the left, then click 'Check Gesture'.",
    instructions: [
      "Look at the reference gesture.",
      "Copy the hand position in front of the camera.",
      "Keep your hand steady.",
      "Press Check Gesture when you are ready.",
      "Try again and match the reference gesture."
    ],
    comingSoonTitle: "Coming Soon",
    comingSoonDesc: "This gesture is not yet reliably recognized by the current classifier. The camera is not needed — practice the hand shape using the guide on the left.",
    correctMessage: "Great job! Your gesture matched",
    incorrectMessage: "Check the finger guide and adjust your hand position.",
    detected: "Detected",
    gestureReference: "Gesture Reference",
    browseAllSigns: "Browse All Signs",
    noSignsFound: "No signs found for",
    sign: "Sign",
    of: "of"
  },
  ta: {
    title: "ISL கற்றல் மற்றும் பயிற்சி",
    subtitle: "சைகையை கற்கவும் → உதாரணத்தைப் பார்க்கவும் → அதை செய்யவும் → கேமரா மூலம் சரிபார்க்கவும்.",
    practice: "பயிற்சி",
    targetSign: "இலக்கு சைகை",
    english: "ஆங்கிலம்",
    tamil: "தமிழ்",
    instructionsTitle: "வழிமுறைகள்",
    startCamera: "கேமராவை தொடங்கவும்",
    stopCamera: "கேமராவை நிறுத்தவும்",
    checkGesture: "சைகையை சரிபார்க்கவும்",
    correct: "சரியானது",
    incorrect: "தவறானது",
    confidence: "நம்பிக்கை மதிப்பெண்",
    tryAgain: "மீண்டும் முயற்சிக்கவும்",
    nextSign: "அடுத்த சைகை",
    prevSign: "முந்தைய சைகை",
    showMeHow: "எப்படி செய்வது?",
    hide: "மறை",
    progress: "முன்னேற்றம்",
    selectCategory: "வகையைத் தேர்ந்தெடுக்கவும்",
    searchSigns: "சைகைகளைத் தேடுங்கள்...",
    attempts: "முயற்சிகள்",
    xp: "XP",
    cameraOff: "கேமரா முடக்கப்பட்டுள்ளது",
    cameraOffDesc: "கேமராவைத் தொடங்கி, இடதுபுறம் காட்டப்பட்டுள்ள சைகையைப் பார்த்து செய்யவும், பின்னர் 'சைகையை சரிபார்க்கவும்' என்பதை அழுத்தவும்.",
    instructions: [
      "குறிப்பிட்ட கை சைகையைப் பாருங்கள்.",
      "கேமரா முன் அதே கை நிலையை செய்யுங்கள்.",
      "உங்கள் கையை நிலையாக வைத்திருங்கள்.",
      "தயாரானதும் 'சைகையை சரிபார்க்கவும்' என்பதை அழுத்துங்கள்.",
      "மீண்டும் முயற்சி செய்து குறிப்பிட்ட சைகையைப் போல செய்யுங்கள்."
    ],
    comingSoonTitle: "விரைவில்",
    comingSoonDesc: "இந்த சைகை இன்னும் தற்போதைய வகைப்படுத்தியால் சரியாக கண்டறியப்படவில்லை. கேமரா தேவையில்லை — இடதுபுறம் உள்ள வழிகாட்டியப் பயன்படுத்தி கை வடிவத்தைப் பயிற்சி செய்யுங்கள்.",
    correctMessage: "மிக நன்று! உங்கள் சைகை பொருந்துகிறது",
    incorrectMessage: "கை வழிகாட்டியைப் பார்த்து உங்கள் கை நிலையை சரிசெய்யவும்.",
    detected: "கண்டறியப்பட்டது",
    gestureReference: "சைகை வழிகாட்டி",
    browseAllSigns: "அனைத்து சைகைகளையும் காண்க",
    noSignsFound: "சைகைகள் காணப்படவில்லை",
    sign: "சைகை",
    of: "இன்"
  }
};

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function Learning() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [showReference, setShowReference]   = useState(true);
  const [sessionScore, setSessionScore]     = useState(0);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const hasCheckedRef = useRef(false); // guard: exactly 1 check per attempt

  const t = UI_TEXT[targetLanguage];
  const catList = CATEGORIES[targetLanguage];

  const { token } = useAuth();

  const {
    videoRef, canvasRef, isCameraActive, trackingStatus,
    normalizedLandmarks, startCamera, stopCamera
  } = useHandTracker();

  const [livePrediction, setLivePrediction] = useState({ label: '—', confidence: 0, key: 'NONE' });

  /* ── Derived filtered sign list ─────────── */
  const filteredSigns = ALL_SIGNS.filter((s) => {
    const matchCat   = activeCategory === 'all' || s.category === activeCategory;
    const q          = searchQuery.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) ||
      s.english.toLowerCase().includes(q) || s.tamil.includes(q);
    return matchCat && matchSearch;
  });

  const safeIndex      = Math.min(currentIndex, Math.max(filteredSigns.length - 1, 0));
  const currentSign    = filteredSigns[safeIndex] || ALL_SIGNS[0];
  const totalSigns     = filteredSigns.length;

  /* ── Keep index in bounds when filter changes ── */
  useEffect(() => {
    setCurrentIndex(0);
    setEvaluationResult(null);
    hasCheckedRef.current = false;
  }, [activeCategory, searchQuery]);

  /* ── Reset evaluation when sign changes ── */
  useEffect(() => {
    setEvaluationResult(null);
    hasCheckedRef.current = false;
    setShowReference(true);
  }, [safeIndex]);

  /* ── Live classifier (view only, NO auto-attempt) ── */
  useEffect(() => {
    if (!isCameraActive || normalizedLandmarks.length === 0) {
      setLivePrediction({ label: '—', confidence: 0, key: 'NONE' });
      return;
    }
    const p = classifyGesture(normalizedLandmarks);
    setLivePrediction(p);
  }, [isCameraActive, normalizedLandmarks]);

  /* ── Navigation ─────────────────────────── */
  const goTo = (idx) => {
    const clamped = Math.max(0, Math.min(idx, filteredSigns.length - 1));
    setCurrentIndex(clamped);
  };

  /* ── Camera toggle ─────────────────────── */
  const handleToggleCamera = () => {
    if (isCameraActive) { stopCamera(); }
    else { setEvaluationResult(null); hasCheckedRef.current = false; startCamera(); }
  };

  /* ── Check Gesture — exactly ONE attempt ── */
  const handleCheckGesture = () => {
    if (!isCameraActive || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const sign   = currentSign;
    const detKey = livePrediction.key || '';
    const conf   = livePrediction.confidence || 0;

    // Match if detected key is in the expected keys list for this sign
    const isMatch = sign.expectedKeys.length > 0 &&
      sign.expectedKeys.some(
        (ek) => detKey === ek || livePrediction.label?.includes(ek)
      ) &&
      conf >= 70;

    setEvaluationResult({
      matched: isMatch,
      detectedLabel: livePrediction.label || '—',
      detectedKey: detKey,
      confidence: conf,
    });

    setSessionAttempts((p) => p + 1);
    if (isMatch) setSessionScore((p) => p + 20);

    if (token) {
      fetch(`${API_BASE_URL}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetGesture: sign.name,
          matched: isMatch,
          confidence: conf,
        }),
      }).catch((e) => console.error('Practice log error:', e));
    }
  };

  const handleTryAgain = () => {
    setEvaluationResult(null);
    hasCheckedRef.current = false;
  };

  const handleNextSign = () => {
    goTo(safeIndex + 1 < totalSigns ? safeIndex + 1 : 0);
  };

  /* ── Render ─────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-cyan-400" />
            <span>{t.title}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {t.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              <span>{t.english}</span>
            </button>
            <button
              onClick={() => setTargetLanguage('ta')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                targetLanguage === 'ta'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.tamil}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-500/30 text-xs font-semibold text-purple-300">
            <Award className="w-4 h-4 text-purple-400" />
            <span>{sessionScore} {t.xp}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{sessionAttempts} {t.attempts}</span>
          </div>
        </div>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div className="flex flex-wrap gap-2">
        {catList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === cat.id
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* ── SEARCH ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder={t.searchSigns}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500/60 focus:outline-none text-sm text-slate-200 placeholder:text-slate-600 transition-colors"
        />
      </div>

      {filteredSigns.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t.noSignsFound} "{searchQuery}".</p>
        </div>
      )}

      {filteredSigns.length > 0 && (
        <>
          {/* ── PROGRESS BAR ── */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
              {t.sign} {safeIndex + 1} {t.of} {totalSigns}
            </span>
            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${((safeIndex + 1) / totalSigns) * 100}%` }}
              />
            </div>
            <div className="flex gap-1">
              <button onClick={() => goTo(safeIndex - 1)} disabled={safeIndex === 0}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => goTo(safeIndex + 1)} disabled={safeIndex >= totalSigns - 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── MAIN PRACTICE CARD ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ─── LEFT: Gesture Reference + Instructions ─── */}
            <div className="lg:col-span-5 space-y-4">

              {/* Sign title header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-white">{currentSign.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <DiffBadge level={currentSign.difficulty} />
                    {currentSign.comingSoon && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        🚧 {t.comingSoonTitle}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-mono">{currentSign.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowReference((p) => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-cyan-400 font-semibold transition-colors whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showReference ? t.hide : t.showMeHow}
                </button>
              </div>

              {/* Translations */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t.english}</p>
                  <p className="text-sm font-bold text-slate-200">{currentSign.english}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t.tamil}</p>
                  <p className="text-sm font-bold text-cyan-400">{currentSign.tamil}</p>
                </div>
              </div>

              {/* Gesture Visual Diagram */}
              {showReference && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-500" /> {t.gestureReference}
                  </p>
                  <div className="w-full aspect-video flex items-center justify-center">
                    <GestureVisual signId={currentSign.id} />
                  </div>
                </div>
              )}

              {/* Step-by-step instructions */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-500" /> {t.instructionsTitle}
                </p>
                <ol className="space-y-2">
                  {t.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-slate-300">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* ─── RIGHT: Camera + Check ─── */}
            <div className="lg:col-span-7 space-y-4">

              {/* Camera viewport */}
              <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
                <video ref={videoRef} className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`} playsInline muted />
                <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full pointer-events-none ${isCameraActive ? 'block' : 'hidden'}`} />

                {isCameraActive && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow border ${
                      livePrediction.key !== 'NONE'
                        ? 'bg-slate-950/90 border-cyan-500/40 text-cyan-400'
                        : 'bg-slate-950/90 border-slate-700 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${livePrediction.key !== 'NONE' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                      {trackingStatus}
                    </span>
                    {livePrediction.key !== 'NONE' && livePrediction.key !== 'DYNAMIC' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/90 border border-slate-700 text-slate-300 text-[11px] font-semibold">
                        {t.detected}: <strong className="text-amber-400 ml-1">{livePrediction.label}</strong>
                        <span className="ml-1 text-slate-500">({livePrediction.confidence}%)</span>
                      </span>
                    )}
                  </div>
                )}

                {!isCameraActive && (
                  <div className="text-center space-y-4 p-10">
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
                      <CameraOff className="w-10 h-10 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-slate-300 font-semibold">{t.cameraOff}</p>
                      <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
                        {t.cameraOffDesc}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleCamera}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all"
                    >
                      <Camera className="w-4 h-4 inline mr-2" />
                      {t.startCamera}
                    </button>
                  </div>
                )}

                {/* Coming Soon overlay on camera */}
                {isCameraActive && currentSign.comingSoon && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
                    <span className="text-5xl">🚧</span>
                    <p className="text-amber-400 font-bold text-base">{t.comingSoonTitle}</p>
                    <p className="text-slate-400 text-xs max-w-xs text-center">
                      {t.comingSoonDesc}
                    </p>
                  </div>
                )}
              </div>

              {/* Camera toggle + Check Gesture + Next */}
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <button
                  onClick={handleToggleCamera}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                    isCameraActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
                  }`}
                >
                  {isCameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  {isCameraActive ? t.stopCamera : t.startCamera}
                </button>

                {!currentSign.comingSoon && (
                  <button
                    onClick={handleCheckGesture}
                    disabled={!isCameraActive || hasCheckedRef.current}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    {t.checkGesture}
                  </button>
                )}

                <button
                  onClick={handleNextSign}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all ml-auto"
                >
                  {t.nextSign}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* ── Evaluation Result ── */}
              {evaluationResult && (
                <div className={`p-5 rounded-2xl border shadow-xl space-y-3 transition-all ${
                  evaluationResult.matched
                    ? 'bg-emerald-950/50 border-emerald-500/40'
                    : 'bg-rose-950/40 border-rose-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {evaluationResult.matched ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-emerald-300 font-extrabold text-lg">{t.correct}! +20 {t.xp}</p>
                          <p className="text-emerald-400/80 text-xs">
                            {t.correctMessage} "{currentSign.name}".
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                        <div>
                          <p className="text-rose-300 font-extrabold text-lg">{t.incorrect} — {t.tryAgain}</p>
                          <p className="text-slate-400 text-xs">
                            {t.detected}: <strong className="text-amber-400">{evaluationResult.detectedLabel}</strong>
                            {' '}({evaluationResult.confidence}%). {t.incorrectMessage}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Confidence bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{t.confidence}</span>
                      <span className={evaluationResult.matched ? 'text-emerald-400' : 'text-rose-400'}>
                        {evaluationResult.confidence}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${evaluationResult.matched ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${evaluationResult.confidence}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleTryAgain}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t.tryAgain}
                    </button>
                    <button
                      onClick={handleNextSign}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
                    >
                      {t.nextSign}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SIGN GRID BROWSER ── */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-500" />
              {t.browseAllSigns} ({totalSigns})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredSigns.map((sign, idx) => (
                <button
                  key={sign.id}
                  onClick={() => goTo(idx)}
                  className={`p-3 rounded-2xl text-left border transition-all space-y-1.5 group ${
                    idx === safeIndex
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white leading-tight truncate">{sign.name}</span>
                    {sign.comingSoon && <span className="text-amber-400 text-[9px] shrink-0">🚧</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{sign.tamil}</p>
                  <div className="flex items-center gap-1">
                    <DiffBadge level={sign.difficulty} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

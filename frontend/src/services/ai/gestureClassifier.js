/**
 * ISL AI Gesture Classifier Module with Movement & Context Disambiguation
 * 
 * Takes raw 3D hand landmarks from MediaPipe (21 joints per hand),
 * performs spatial coordinate normalization (wrist centering & scale invariant division),
 * and classifies Indian Sign Language (ISL) gestures using geometric heuristics
 * and multi-frame movement history to disambiguate visually similar gestures.
 */

// Landmark Index Constants for MediaPipe Hands
const WRIST = 0;
const THUMB_CMC = 1, THUMB_MCP = 2, THUMB_IP = 3, THUMB_TIP = 4;
const INDEX_MCP = 5, INDEX_PIP = 6, INDEX_DIP = 7, INDEX_TIP = 8;
const MIDDLE_MCP = 9, MIDDLE_PIP = 10, MIDDLE_DIP = 11, MIDDLE_TIP = 12;
const RING_MCP = 13, RING_PIP = 14, RING_DIP = 15, RING_TIP = 16;
const PINKY_MCP = 17, PINKY_PIP = 18, PINKY_DIP = 19, PINKY_TIP = 20;

/**
 * Centralized Tamil Translation Map
 */
export const TAMIL_TRANSLATIONS = {
  "Hello": "வணக்கம்",
  "Namaste": "வணக்கம்",
  "Stop": "நிறுத்து",
  "Water": "தண்ணீர்",
  "Yes": "ஆம்",
  "Agree": "ஒப்புக்கொள்கிறேன்",
  "Good": "நல்லது",
  "Help": "உதவி",
  "Peace": "அமைதி",
  "Victory": "வெற்றி",
  "Two": "இரண்டு",
  "Three": "மூன்று",
  "Five": "ஐந்து",
  "Open Palm": "திறந்த உள்ளங்கை",
  "Letter A": "எழுத்து A",
  "Letter B": "எழுத்து B",
  "Letter C": "எழுத்து C",
  "Letter L": "எழுத்து L",
  "Heart": "இதயம்"
};

/**
 * Normalizes 21 3D landmarks for scale and position invariance
 */
export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 21) return [];

  const wrist = landmarks[WRIST];
  const middleMcp = landmarks[MIDDLE_MCP];

  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const dz = (middleMcp.z || 0) - (wrist.z || 0);
  const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

  return landmarks.map((pt) => ({
    x: (pt.x - wrist.x) / scale,
    y: (pt.y - wrist.y) / scale,
    z: ((pt.z || 0) - (wrist.z || 0)) / scale
  }));
}

/**
 * Calculates Euclidean distance between two 3D points
 */
function dist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Classifies normalized hand landmark vectors into ISL Gestures.
 * 
 * @param {Array} multiHandLandmarks Array of detected hands, each containing 21 landmarks
 * @param {Array} wristHistory Array of recent wrist coordinates [{x, y, timestamp}]
 * @returns {Object} { key, handShapeGroup, label, englishLabel, tamilLabel, english, tamil, confidence, possibleOptions }
 */
export function classifyGesture(multiHandLandmarks, wristHistory = []) {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
    return {
      key: 'NONE',
      handShapeGroup: 'NONE',
      label: '—',
      englishLabel: 'No Hand Detected',
      tamilLabel: 'சைகை கண்டறியப்படவில்லை',
      english: '',
      tamil: '',
      confidence: 0,
      possibleOptions: []
    };
  }

  // Dual Hand Gesture Detection
  if (multiHandLandmarks.length === 2) {
    const hand1Raw = multiHandLandmarks[0];
    const hand2Raw = multiHandLandmarks[1];
    const hand1 = normalizeLandmarks(hand1Raw);
    const hand2 = normalizeLandmarks(hand2Raw);

    if (hand1.length === 21 && hand2.length === 21) {

      // --- HEART GESTURE ---
      // Both hands: thumb extended upward + index finger curled inward (NOT extended).
      // Additionally, the raw thumb tips of the two hands must be close together
      // (touching/overlapping in camera space to form the top curve of a heart).
      const h1ThumbExt = isThumbExtended(hand1);
      const h2ThumbExt = isThumbExtended(hand2);
      const h1IndexCurled = !isFingerExtended(hand1, INDEX_TIP, INDEX_MCP);
      const h2IndexCurled = !isFingerExtended(hand2, INDEX_TIP, INDEX_MCP);
      const h1MiddleCurled = !isFingerExtended(hand1, MIDDLE_TIP, MIDDLE_MCP);
      const h2MiddleCurled = !isFingerExtended(hand2, MIDDLE_TIP, MIDDLE_MCP);

      // Raw (image-space) distance between the two thumb tips
      const rawThumbTip1 = hand1Raw[THUMB_TIP];
      const rawThumbTip2 = hand2Raw[THUMB_TIP];
      const thumbTipDx = rawThumbTip1.x - rawThumbTip2.x;
      const thumbTipDy = rawThumbTip1.y - rawThumbTip2.y;
      const thumbTipDist = Math.sqrt(thumbTipDx * thumbTipDx + thumbTipDy * thumbTipDy);

      // Thumbs must be within ~15% of frame width of each other
      const thumbsTouching = thumbTipDist < 0.15;

      if (h1ThumbExt && h2ThumbExt && h1IndexCurled && h2IndexCurled && h1MiddleCurled && h2MiddleCurled && thumbsTouching) {
        return {
          key: 'HEART',
          handShapeGroup: 'HEART_GROUP',
          label: 'HEART (TWO HANDS)',
          englishLabel: 'Heart',
          tamilLabel: TAMIL_TRANSLATIONS['Heart'],
          english: 'Heart',
          tamil: TAMIL_TRANSLATIONS['Heart'],
          confidence: 93,
          possibleOptions: [
            { key: 'HEART', en: 'Heart', ta: TAMIL_TRANSLATIONS['Heart'] },
            { key: 'THUMBS_UP', en: 'Yes', ta: TAMIL_TRANSLATIONS['Yes'] }
          ]
        };
      }

      // --- NAMASTE / GREETING ---
      // Both hands: index AND middle fingers extended
      const h1Extended = isFingerExtended(hand1, INDEX_TIP, INDEX_MCP) && isFingerExtended(hand1, MIDDLE_TIP, MIDDLE_MCP);
      const h2Extended = isFingerExtended(hand2, INDEX_TIP, INDEX_MCP) && isFingerExtended(hand2, MIDDLE_TIP, MIDDLE_MCP);

      if (h1Extended && h2Extended) {
        return {
          key: 'NAMASTE',
          handShapeGroup: 'NAMASTE_GROUP',
          label: 'NAMASTE / GREETING',
          englishLabel: 'Hello / Namaste',
          tamilLabel: 'வணக்கம்',
          english: 'Hello',
          tamil: TAMIL_TRANSLATIONS['Hello'],
          confidence: 95,
          possibleOptions: [
            { key: 'HELLO', en: 'Hello', ta: TAMIL_TRANSLATIONS['Hello'] },
            { key: 'HELP', en: 'Help', ta: TAMIL_TRANSLATIONS['Help'] }
          ]
        };
      }
    }
  }

  // Single Hand Gesture Detection
  const rawLandmarks = multiHandLandmarks[0];
  const pts = normalizeLandmarks(rawLandmarks);
  if (pts.length < 21) {
    return {
      key: 'NONE',
      handShapeGroup: 'NONE',
      label: '—',
      englishLabel: 'Tracking Hand...',
      tamilLabel: 'கணக்கிடப்படுகிறது...',
      english: '',
      tamil: '',
      confidence: 0,
      possibleOptions: []
    };
  }

  const indexExtended = isFingerExtended(pts, INDEX_TIP, INDEX_MCP);
  const middleExtended = isFingerExtended(pts, MIDDLE_TIP, MIDDLE_MCP);
  const ringExtended = isFingerExtended(pts, RING_TIP, RING_MCP);
  const pinkyExtended = isFingerExtended(pts, PINKY_TIP, PINKY_MCP);
  const thumbExtended = isThumbExtended(pts);

  // Analyze multi-frame movement history for open palm disambiguation
  let isWaving = false;
  let isStationary = true;
  if (wristHistory && wristHistory.length >= 4) {
    let minX = wristHistory[0].x;
    let maxX = wristHistory[0].x;
    let minY = wristHistory[0].y;
    let maxY = wristHistory[0].y;
    let directionChanges = 0;
    let lastDx = 0;

    for (let i = 1; i < wristHistory.length; i++) {
      const x = wristHistory[i].x;
      const y = wristHistory[i].y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const dx = x - wristHistory[i - 1].x;
      if (Math.abs(dx) > 0.008) {
        if ((dx > 0 && lastDx < 0) || (dx < 0 && lastDx > 0)) {
          directionChanges += 1;
        }
        lastDx = dx;
      }
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const totalMovement = rangeX + rangeY;

    if (rangeX > 0.05 && directionChanges >= 1) {
      isWaving = true;
      isStationary = false;
    } else if (totalMovement > 0.08) {
      isStationary = false;
    }
  }

  // ── Compatible Options ──────────────────────────────────────────────────────
  // Derive possibleOptions entirely from the SAME finger booleans that drive
  // the rules below. This is the single source of truth for every return
  // statement in the single-hand section, so possibleOptions can never contain
  // gestures that are geometrically incompatible with the current hand shape.
  const allFourExtended   = indexExtended && middleExtended && ringExtended && pinkyExtended;
  const thumbOnlyExtended = thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

  const compatibleOptions = (() => {
    const opts = [];

    // All 4 fingers extended + thumb extended → Hello / Stop / Five family
    if (allFourExtended && thumbExtended) {
      opts.push(
        { key: 'HELLO', en: 'Hello',   ta: TAMIL_TRANSLATIONS['Hello'] },
        { key: 'STOP',  en: 'Stop',    ta: TAMIL_TRANSLATIONS['Stop']  },
        { key: 'FIVE',  en: 'Five',    ta: TAMIL_TRANSLATIONS['Five']  }
      );
    }
    // All 4 fingers extended + thumb curled → Letter B
    if (allFourExtended && !thumbExtended) {
      opts.push({ key: 'LETTER_B', en: 'Letter B', ta: TAMIL_TRANSLATIONS['Letter B'] });
    }
    // Thumb only extended (all other fingers curled) → Yes / Help
    if (thumbOnlyExtended) {
      opts.push(
        { key: 'THUMBS_UP', en: 'Yes',  ta: TAMIL_TRANSLATIONS['Yes']  },
        { key: 'HELP',      en: 'Help', ta: TAMIL_TRANSLATIONS['Help'] }
      );
    }
    // Index + middle extended, ring + pinky curled → Peace / Victory
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
      opts.push(
        { key: 'PEACE', en: 'Victory', ta: TAMIL_TRANSLATIONS['Victory'] },
        { key: 'PEACE', en: 'Peace',   ta: TAMIL_TRANSLATIONS['Peace']   }
      );
    }
    // Index + thumb extended, middle + ring + pinky curled → Letter L
    if (indexExtended && thumbExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      opts.push({ key: 'LETTER_L', en: 'Letter L', ta: TAMIL_TRANSLATIONS['Letter L'] });
    }
    // Index + middle + ring extended, pinky curled → Water
    if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
      opts.push({ key: 'WATER', en: 'Water', ta: TAMIL_TRANSLATIONS['Water'] });
    }
    // All 4 fingers curled → Letter A (thumb state determines if Help is also possible)
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
      opts.push({ key: 'LETTER_A', en: 'Letter A', ta: TAMIL_TRANSLATIONS['Letter A'] });
    }

    return opts.length > 0 ? opts : [];
  })();

  // 1. ISL LETTER B — evaluated BEFORE the open-palm block.
  //    Letter B = all 4 fingers extended + thumb curled.
  //    Without this early check, the open-palm block (rule 2) would always
  //    fire first on any all-4-extended hand, making Letter B unreachable.
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
    return {
      key: 'LETTER_B',
      handShapeGroup: 'LETTER_B_GROUP',
      label: 'ISL LETTER B',
      englishLabel: 'Letter B',
      tamilLabel: TAMIL_TRANSLATIONS['Letter B'],
      english: 'Letter B',
      tamil: TAMIL_TRANSLATIONS['Letter B'],
      confidence: 89,
      possibleOptions: compatibleOptions
    };
  }

  // 2. OPEN PALM DISAMBIGUATION (Hello vs Stop vs Five)
  //    Reaches here only when thumbExtended == true (Letter B was handled above).
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    const rawWrist = rawLandmarks[WRIST];
    const rawMiddleMcp = rawLandmarks[MIDDLE_MCP];
    const dy = rawWrist.y - rawMiddleMcp.y;
    const isUpright = dy > 0.1;

    if (isWaving) {
      return {
        key: 'HELLO',
        handShapeGroup: 'OPEN_PALM_GROUP',
        label: 'HELLO (WAVING PALM)',
        englishLabel: 'Hello',
        tamilLabel: TAMIL_TRANSLATIONS['Hello'],
        english: 'Hello',
        tamil: TAMIL_TRANSLATIONS['Hello'],
        confidence: 90,
        possibleOptions: compatibleOptions
      };
    } else if (isStationary && isUpright) {
      return {
        key: 'STOP',
        handShapeGroup: 'OPEN_PALM_GROUP',
        label: 'STOP SIGN',
        englishLabel: 'Stop',
        tamilLabel: TAMIL_TRANSLATIONS['Stop'],
        english: 'Stop',
        tamil: TAMIL_TRANSLATIONS['Stop'],
        confidence: 88,
        possibleOptions: compatibleOptions
      };
    } else if (isStationary) {
      return {
        key: 'FIVE',
        handShapeGroup: 'OPEN_PALM_GROUP',
        label: 'FIVE / OPEN PALM',
        englishLabel: 'Five',
        tamilLabel: TAMIL_TRANSLATIONS['Five'],
        english: 'Five',
        tamil: TAMIL_TRANSLATIONS['Five'],
        confidence: 86,
        possibleOptions: compatibleOptions
      };
    } else {
      return {
        key: 'STOP',
        handShapeGroup: 'OPEN_PALM_GROUP',
        label: 'OPEN PALM (UNCLEAR MOTION)',
        englishLabel: 'Stop / Hello',
        tamilLabel: `${TAMIL_TRANSLATIONS['Stop']} / ${TAMIL_TRANSLATIONS['Hello']}`,
        english: 'Stop',
        tamil: TAMIL_TRANSLATIONS['Stop'],
        confidence: 72,
        possibleOptions: compatibleOptions
      };
    }
  }

  // 2. THUMBS UP / AGREE
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const thumbUp = pts[THUMB_TIP].y < pts[THUMB_MCP].y;
    if (thumbUp) {
      return {
        key: 'THUMBS_UP',
        handShapeGroup: 'THUMBS_UP_GROUP',
        label: 'THUMBS UP / AGREE',
        englishLabel: 'Yes / Agree',
        tamilLabel: `${TAMIL_TRANSLATIONS['Yes']} / ${TAMIL_TRANSLATIONS['Good']}`,
        english: 'Yes',
        tamil: TAMIL_TRANSLATIONS['Yes'],
        confidence: 92,
        possibleOptions: compatibleOptions
      };
    }
  }

  // 2b. HELP — thumb extended + all 4 fingers curled + thumb NOT pointing upward.
  //     Same hand shape as Yes/Thumbs-Up but thumb is horizontal or pointing sideways/down.
  //     In ISL, Help is typically shown by extending the thumb to the side on a closed fist.
  //     Rule: thumbExtended && all fingers curled && thumbTip.y >= thumbMCP.y (not up).
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const thumbSideways = pts[THUMB_TIP].y >= pts[THUMB_MCP].y;
    if (thumbSideways) {
      return {
        key: 'HELP',
        handShapeGroup: 'HELP_GROUP',
        label: 'HELP',
        englishLabel: 'Help',
        tamilLabel: TAMIL_TRANSLATIONS['Help'],
        english: 'Help',
        tamil: TAMIL_TRANSLATIONS['Help'],
        confidence: 88,
        possibleOptions: compatibleOptions
      };
    }
  }

  // 3. VICTORY / PEACE
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return {
      key: 'PEACE',
      handShapeGroup: 'PEACE_GROUP',
      label: 'PEACE / VICTORY',
      englishLabel: 'Peace / Victory',
      tamilLabel: `${TAMIL_TRANSLATIONS['Victory']} / ${TAMIL_TRANSLATIONS['Peace']}`,
      english: 'Victory',
      tamil: TAMIL_TRANSLATIONS['Victory'],
      confidence: 91,
      possibleOptions: compatibleOptions
    };
  }

  // 4. LETTER L
  if (indexExtended && thumbExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return {
      key: 'LETTER_L',
      handShapeGroup: 'LETTER_L_GROUP',
      label: 'ISL LETTER L',
      englishLabel: 'Letter L',
      tamilLabel: TAMIL_TRANSLATIONS['Letter L'],
      english: 'Letter L',
      tamil: TAMIL_TRANSLATIONS['Letter L'],
      confidence: 90,
      possibleOptions: compatibleOptions
    };
  }

  // 5. WATER (index + middle + ring extended, pinky curled)
  if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
    return {
      key: 'WATER',
      handShapeGroup: 'WATER_GROUP',
      label: 'WATER',
      englishLabel: 'Water',
      tamilLabel: TAMIL_TRANSLATIONS['Water'],
      english: 'Water',
      tamil: TAMIL_TRANSLATIONS['Water'],
      confidence: 89,
      possibleOptions: compatibleOptions
    };
  }

  // (The original Letter B block here was unreachable and has been removed.
  //  Letter B is now handled correctly at rule 1 above.)

  // 6. ISL LETTER A / FIST
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return {
      key: 'LETTER_A',
      handShapeGroup: 'LETTER_A_GROUP',
      label: 'ISL LETTER A / FIST',
      englishLabel: 'Letter A / Help',
      tamilLabel: `${TAMIL_TRANSLATIONS['Letter A']} / ${TAMIL_TRANSLATIONS['Help']}`,
      english: 'Letter A',
      tamil: TAMIL_TRANSLATIONS['Letter A'],
      confidence: 88,
      possibleOptions: compatibleOptions
    };
  }

  // 7. ISL LETTER C
  const thumbIndexDist = dist(pts[THUMB_TIP], pts[INDEX_TIP]);
  if (thumbIndexDist > 0.4 && thumbIndexDist < 0.9 && !indexExtended) {
    return {
      key: 'LETTER_C',
      handShapeGroup: 'LETTER_C_GROUP',
      label: 'ISL LETTER C',
      englishLabel: 'Letter C',
      tamilLabel: TAMIL_TRANSLATIONS['Letter C'],
      english: 'Letter C',
      tamil: TAMIL_TRANSLATIONS['Letter C'],
      confidence: 87,
      possibleOptions: compatibleOptions
    };
  }

  // Low confidence / unclear gesture fallback
  return {
    key: 'DYNAMIC',
    handShapeGroup: 'DYNAMIC',
    label: 'UNCLEAR GESTURE',
    englishLabel: 'Gesture Unclear',
    tamilLabel: 'சைகை தெளிவாக இல்லை',
    english: 'Gesture',
    tamil: 'சைகை',
    confidence: 52,
    possibleOptions: []
  };
}

function isFingerExtended(pts, tipIdx, mcpIdx) {
  const tipDist = dist(pts[tipIdx], pts[WRIST]);
  const mcpDist = dist(pts[mcpIdx], pts[WRIST]);
  return tipDist > mcpDist * 1.25;
}

function isThumbExtended(pts) {
  const tipDist = dist(pts[THUMB_TIP], pts[WRIST]);
  const mcpDist = dist(pts[THUMB_MCP], pts[WRIST]);
  return tipDist > mcpDist * 1.2;
}

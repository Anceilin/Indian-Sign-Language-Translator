import express from 'express';
import Translation from '../models/Translation.js';
import Practice from '../models/Practice.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/stats
 * @desc    Get aggregated dashboard stats for the logged-in user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Total translations count (only from Translation history)
    const totalTranslations = await Translation.countDocuments({ user: userId });

    // 2. Recent translations list
    const recentTranslations = await Translation.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // 3. Practice stats (only from Practice attempts)
    const totalPracticeAttempts = await Practice.countDocuments({ user: userId });

    // 4. Unique signs actually mastered in Practice mode
    const uniqueMatchedSigns = await Practice.distinct('targetGesture', { user: userId, matched: true });
    const successfulPractices = uniqueMatchedSigns.length;

    // 5. Average confidence (from saved translations, fallback to practice attempts or 0)
    const confResult = await Translation.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, avgConf: { $avg: '$confidence' } } }
    ]);

    let avgConfidence = 0;
    if (confResult.length > 0 && confResult[0].avgConf != null) {
      avgConfidence = Math.round(confResult[0].avgConf);
    } else {
      const practiceConf = await Practice.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, avgConf: { $avg: '$confidence' } } }
      ]);
      if (practiceConf.length > 0 && practiceConf[0].avgConf != null) {
        avgConfidence = Math.round(practiceConf[0].avgConf);
      }
    }

    // 6. Practice Score (XP) calculated SOLELY from actual practice attempts
    const practiceScoreXP = (successfulPractices * 50) + (totalPracticeAttempts * 10);

    res.status(200).json({
      status: 'success',
      data: {
        totalTranslations,
        totalPracticeAttempts,
        successfulPractices,
        avgConfidence,
        practiceScoreXP,
        recentTranslations
      }
    });
  } catch (error) {
    console.error('Fetch Stats Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user analytics stats'
    });
  }
});

export default router;

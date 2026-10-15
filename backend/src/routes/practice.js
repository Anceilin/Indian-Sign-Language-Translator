import express from 'express';
import Practice from '../models/Practice.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @route   POST /api/practice
 * @desc    Record a learning practice attempt
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { targetGesture, matched, confidence } = req.body;

    if (!targetGesture) {
      return res.status(400).json({
        status: 'error',
        message: 'Target gesture is required'
      });
    }

    const practiceAttempt = await Practice.create({
      user: req.user._id,
      targetGesture,
      matched: Boolean(matched),
      confidence: confidence || 0
    });

    res.status(201).json({
      status: 'success',
      data: practiceAttempt
    });
  } catch (error) {
    console.error('Practice Attempt Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record practice attempt'
    });
  }
});

export default router;

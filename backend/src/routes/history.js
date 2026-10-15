import express from 'express';
import Translation from '../models/Translation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply JWT protection middleware to all history routes
router.use(protect);

/**
 * @route   GET /api/history
 * @desc    Get all translation history items for the logged-in user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const history = await Translation.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      status: 'success',
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Fetch History Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch translation history'
    });
  }
});

/**
 * @route   POST /api/history
 * @desc    Save a completed translation item
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { sign, sentence, language, confidence, mode } = req.body;

    if (!sentence || sentence.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Sentence text is required'
      });
    }

    const newTranslation = await Translation.create({
      user: req.user._id,
      sign: sign || '—',
      sentence: sentence.trim(),
      language: language || 'en',
      confidence: confidence || 0,
      mode: mode || 'Live Webcam'
    });

    res.status(201).json({
      status: 'success',
      message: 'Translation saved successfully',
      data: newTranslation
    });
  } catch (error) {
    console.error('Save Translation Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save translation'
    });
  }
});

/**
 * @route   DELETE /api/history/:id
 * @desc    Delete a specific history item belonging to logged-in user
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const item = await Translation.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Translation history item not found'
      });
    }

    await item.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Translation history item deleted'
    });
  } catch (error) {
    console.error('Delete History Item Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete history item'
    });
  }
});

/**
 * @route   DELETE /api/history
 * @desc    Clear all translation history items for logged-in user
 * @access  Private
 */
router.delete('/', async (req, res) => {
  try {
    await Translation.deleteMany({ user: req.user._id });
    res.status(200).json({
      status: 'success',
      message: 'All translation history cleared'
    });
  } catch (error) {
    console.error('Clear History Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear history'
    });
  }
});

export default router;

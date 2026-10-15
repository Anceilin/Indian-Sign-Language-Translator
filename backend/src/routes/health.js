import express from 'express';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint to verify backend status
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ISL AI Translator Backend API is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    stage: 'Stage 1 — Project Foundation'
  });
});

export default router;

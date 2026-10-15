import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setServers } from 'node:dns';

import connectDB from './config/db.js';
import healthRoute from './routes/health.js';
import authRoute from './routes/auth.js';
import historyRoute from './routes/history.js';
import practiceRoute from './routes/practice.js';
import statsRoute from './routes/stats.js';
import ttsRoute from './routes/tts.js';

// Load environment variables
dotenv.config();

// Use reliable DNS servers for MongoDB Atlas SRV lookup
setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || 'http://localhost:5173';

// CORS configuration
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );

  next();
});

// API routes
app.use('/api/health', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api/history', historyRoute);
app.use('/api/practice', practiceRoute);
app.use('/api/stats', statsRoute);
app.use('/api/tts', ttsRoute);

// Base route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to ISL AI Translator API Server',
    healthCheck: '/api/health'
  });
});

// 404 route handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server`
  });
});

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Connect to MongoDB before starting the Express server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log('=================================');
      console.log('🚀 ISL AI Translator Backend');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(
        `🔗 Health Check: http://localhost:${PORT}/api/health`
      );
      console.log('=================================');
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error.message);
    process.exit(1);
  }
};

startServer();
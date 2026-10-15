import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sign: {
    type: String,
    default: '—'
  },
  sentence: {
    type: String,
    required: [true, 'Sentence text is required']
  },
  language: {
    type: String,
    enum: ['en', 'ta'],
    default: 'en'
  },
  confidence: {
    type: Number,
    default: 0
  },
  mode: {
    type: String,
    enum: ['Live Webcam', 'Practice Mode'],
    default: 'Live Webcam'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Translation = mongoose.model('Translation', translationSchema);

export default Translation;

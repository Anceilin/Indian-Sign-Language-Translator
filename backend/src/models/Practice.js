import mongoose from 'mongoose';

const practiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetGesture: {
    type: String,
    required: true
  },
  matched: {
    type: Boolean,
    required: true
  },
  confidence: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Practice = mongoose.model('Practice', practiceSchema);

export default Practice;

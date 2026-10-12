import mongoose from 'mongoose';

const answerRecordSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    markedForReview: {
      type: Boolean,
      default: false,
    },
    visited: {
      type: Boolean,
      default: false,
    },
    timeSpentMs: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    deadline: {
      type: Date,
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'auto-submitted'],
      default: 'in-progress',
      index: true,
    },
    answers: {
      type: [answerRecordSchema],
      default: [],
    },
    // Finalized scoring fields
    score: {
      type: Number,
      default: null,
    },
    maxScore: {
      type: Number,
      default: null,
    },
    percentage: {
      type: Number,
      default: null,
    },
    correctCount: {
      type: Number,
      default: null,
    },
    incorrectCount: {
      type: Number,
      default: null,
    },
    unattemptedCount: {
      type: Number,
      default: null,
    },
    markedCount: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to support fast queries for active attempts and retake history
attemptSchema.index({ student: 1, quiz: 1, status: 1 });

export const Attempt = mongoose.model('Attempt', attemptSchema);

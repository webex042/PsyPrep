import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      index: true,
    },
    type: {
      type: String,
      enum: ['single', 'multiple', 'boolean', 'numeric'],
      default: 'single',
    },
    stem: {
      type: String,
      required: true,
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    marks: {
      type: Number,
      default: 1,
      min: 0,
    },
    explanation: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      default: 'General',
      trim: true,
    },
    topic: {
      type: String,
      default: 'General',
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
  },
  {
    timestamps: true,
  }
);

// Method to return question safe for student test runner (no answers or explanations)
questionSchema.methods.toStudentJSON = function () {
  return {
    _id: this._id,
    type: this.type,
    stem: this.stem,
    options: this.options,
    marks: this.marks,
    subject: this.subject,
    topic: this.topic,
    difficulty: this.difficulty,
  };
};

export const Question = mongoose.model('Question', questionSchema);

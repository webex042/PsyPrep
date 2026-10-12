import { parse } from 'csv-parse/sync';
import { Question } from '../models/Question.js';
import { Quiz } from '../models/Quiz.js';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Normalizes options into standard format: [{ id: "A", text: "..." }]
 */
export function normalizeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions.map((opt, index) => {
    if (typeof opt === 'string') {
      return {
        id: OPTION_LETTERS[index] || `opt_${index + 1}`,
        text: opt.trim(),
      };
    }
    if (typeof opt === 'object' && opt !== null) {
      return {
        id: String(opt.id || OPTION_LETTERS[index] || `opt_${index + 1}`).trim(),
        text: String(opt.text || opt.label || '').trim(),
      };
    }
    return {
      id: OPTION_LETTERS[index] || `opt_${index + 1}`,
      text: String(opt).trim(),
    };
  });
}

/**
 * Normalizes a question object from JSON or CSV row
 */
export function normalizeQuestion(raw, defaultMarks = 1) {
  const stem = String(raw.stem || raw.question || raw.Question || '').trim();
  if (!stem) {
    throw new Error('Question stem cannot be empty');
  }

  let options = [];
  if (Array.isArray(raw.options)) {
    options = normalizeOptions(raw.options);
  } else if (raw.optionA || raw.optionB || raw.optionC || raw.optionD) {
    // CSV column format: optionA, optionB, optionC, optionD
    options = [
      raw.optionA && { id: 'A', text: String(raw.optionA).trim() },
      raw.optionB && { id: 'B', text: String(raw.optionB).trim() },
      raw.optionC && { id: 'C', text: String(raw.optionC).trim() },
      raw.optionD && { id: 'D', text: String(raw.optionD).trim() },
    ].filter(Boolean);
  } else if (typeof raw.options === 'string') {
    // Comma-separated or JSON string in CSV
    try {
      const parsed = JSON.parse(raw.options);
      options = normalizeOptions(parsed);
    } catch {
      options = normalizeOptions(raw.options.split('|').map((s) => s.trim()));
    }
  }

  if (options.length < 2) {
    throw new Error(`Question "${stem.substring(0, 30)}..." must have at least 2 options`);
  }

  let correctAnswer = raw.correctAnswer || raw.answer || raw.Answer;
  if (correctAnswer === undefined || correctAnswer === null) {
    throw new Error(`Question "${stem.substring(0, 30)}..." is missing a correctAnswer`);
  }

  // If correctAnswer is numeric index like 0, map to option id
  if (typeof correctAnswer === 'number' && options[correctAnswer]) {
    correctAnswer = options[correctAnswer].id;
  } else {
    correctAnswer = String(correctAnswer).trim();
  }

  return {
    type: raw.type || 'single',
    stem,
    options,
    correctAnswer,
    marks: Number(raw.marks || defaultMarks) || defaultMarks,
    explanation: String(raw.explanation || raw.Explanation || '').trim(),
    subject: String(raw.subject || raw.Subject || 'General').trim(),
    topic: String(raw.topic || raw.Topic || 'General').trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(String(raw.difficulty).toLowerCase())
      ? String(raw.difficulty).toLowerCase()
      : 'medium',
  };
}

/**
 * Parses raw CSV string into normalized question objects
 */
export function parseQuestionsFromCSV(csvString, defaultMarks = 1) {
  const records = parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record) => normalizeQuestion(record, defaultMarks));
}

/**
 * Imports an array of raw question definitions into a specific quiz
 */
export async function importQuestionsIntoQuiz(quizId, rawQuestionsList) {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const normalizedList = rawQuestionsList.map((q) =>
    normalizeQuestion(q, quiz.marksPerQuestion || 1)
  );

  const questionDocs = normalizedList.map((q) => ({
    ...q,
    quiz: quiz._id,
  }));

  const inserted = await Question.insertMany(questionDocs);
  const insertedIds = inserted.map((doc) => doc._id);

  quiz.questions.push(...insertedIds);
  quiz.totalMarks = (quiz.totalMarks || 0) + inserted.reduce((sum, q) => sum + (q.marks || 1), 0);
  await quiz.save();

  return {
    count: inserted.length,
    quiz,
    questions: inserted,
  };
}

import { Question } from '../models/Question.js';
import { Quiz } from '../models/Quiz.js';

/**
 * Compares student response with question correctAnswer.
 * Supports single-correct MCQ (primary), boolean, numeric, and multiple-choice.
 * Strict no-negative-marking rule: correct earns question.marks, wrong/unattempted earn 0.
 */
export function evaluateAnswer(question, response) {
  if (response === null || response === undefined || response === '') {
    return { isCorrect: false, isUnattempted: true, marksAwarded: 0 };
  }

  const marks = Number(question.marks) || 1;
  const expected = question.correctAnswer;
  let isCorrect = false;

  switch (question.type) {
    case 'multiple':
      // Expect array of selected option IDs
      if (Array.isArray(response) && Array.isArray(expected)) {
        const sortedResp = [...response].map(String).sort();
        const sortedExp = [...expected].map(String).sort();
        isCorrect =
          sortedResp.length === sortedExp.length &&
          sortedResp.every((val, idx) => val.toUpperCase() === sortedExp[idx].toUpperCase());
      }
      break;

    case 'boolean':
      isCorrect =
        String(response).trim().toLowerCase() === String(expected).trim().toLowerCase();
      break;

    case 'numeric':
      isCorrect = Math.abs(Number(response) - Number(expected)) < 0.0001;
      break;

    case 'single':
    default:
      // Single-correct MCQ: case-insensitive option id comparison (e.g. "A" === "A")
      isCorrect =
        String(response).trim().toUpperCase() === String(expected).trim().toUpperCase();
      break;
  }

  return {
    isCorrect,
    isUnattempted: false,
    marksAwarded: isCorrect ? marks : 0,
  };
}

/**
 * Server-authoritative grading for an attempt.
 * Grades against DB Question documents, applies marks, and returns scoring breakdown.
 */
export async function gradeAttempt(attempt) {
  const quiz = await Quiz.findById(attempt.quiz).populate('questions');
  if (!quiz) {
    throw new Error('Quiz associated with attempt not found');
  }

  // Map answers by question ID
  const answerMap = new Map();
  for (const ans of attempt.answers || []) {
    answerMap.set(ans.question.toString(), ans);
  }

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  let markedCount = 0;

  for (const question of quiz.questions) {
    const qIdStr = question._id.toString();
    const qMarks = Number(question.marks) || Number(quiz.marksPerQuestion) || 1;
    maxScore += qMarks;

    const answerRecord = answerMap.get(qIdStr);
    const response = answerRecord ? answerRecord.response : null;

    if (answerRecord && answerRecord.markedForReview) {
      markedCount++;
    }

    const evalResult = evaluateAnswer(question, response);

    if (evalResult.isUnattempted) {
      unattemptedCount++;
    } else if (evalResult.isCorrect) {
      correctCount++;
      totalScore += evalResult.marksAwarded;
    } else {
      incorrectCount++;
    }
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

  return {
    score: totalScore,
    maxScore,
    percentage,
    correctCount,
    incorrectCount,
    unattemptedCount,
    markedCount,
  };
}

/**
 * Finalizes an attempt (called by manual submit, finalize-on-access, or cron job)
 */
export async function finalizeAttempt(attempt, status = 'submitted') {
  if (attempt.status !== 'in-progress') {
    return attempt;
  }

  const scores = await gradeAttempt(attempt);

  attempt.status = status;
  attempt.submittedAt = attempt.submittedAt || new Date();
  attempt.finalizedAt = new Date();
  attempt.score = scores.score;
  attempt.maxScore = scores.maxScore;
  attempt.percentage = scores.percentage;
  attempt.correctCount = scores.correctCount;
  attempt.incorrectCount = scores.incorrectCount;
  attempt.unattemptedCount = scores.unattemptedCount;
  attempt.markedCount = scores.markedCount;

  await attempt.save();
  return attempt;
}

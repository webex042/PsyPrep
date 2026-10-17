import rawQuestions from '../data/questions.json';
import { api } from '../api/client';

const TOTAL_SETS = 50;
const QUESTIONS_PER_TEST = 50;
const DURATION_MINUTES = 60;
const STORAGE_PREFIX = 'psyprep_mock_attempt_';
const HISTORY_KEY = 'psyprep_mock_history';
const ACTIVE_SET_PREFIX = 'psyprep_active_set_';

/**
 * Returns the central question bank containing all 140 questions.
 * Preserves the original question bank immutably.
 */
let cachedQuestions = null;

export async function getQuestionBank() {
  if (cachedQuestions && cachedQuestions.length >= 140) {
    return [...cachedQuestions];
  }

  // Try API first to synchronize with backend if available, fallback to bundled JSON
  try {
    const res = await api.get('/api/questions/bank');
    if (res && Array.isArray(res.questions) && res.questions.length >= 140) {
      cachedQuestions = res.questions;
      return [...cachedQuestions];
    }
  } catch {
    // If backend is offline or unseeded, use bundled questions.json
  }

  cachedQuestions = Array.isArray(rawQuestions) ? rawQuestions : [];
  return [...cachedQuestions];
}

/**
 * Synchronous accessor for bundled question bank (e.g. for instant rendering or tests).
 */
export function getBundledQuestionBank() {
  return Array.isArray(rawQuestions) ? [...rawQuestions] : [];
}

/**
 * Fisher-Yates random sampling without replacement.
 * Selects `count` unique items randomly from `array` and shuffles their order.
 * Never modifies the source array.
 */
export function sampleWithoutReplacement(sourceArray, count) {
  if (!Array.isArray(sourceArray)) {
    throw new Error('sourceArray must be a valid array');
  }
  if (sourceArray.length < count) {
    throw new Error(
      `Cannot sample ${count} questions from a bank of ${sourceArray.length} items.`
    );
  }

  // Create shallow clone of items to avoid modifying the original question bank
  const pool = sourceArray.slice();

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  // Take the first `count` unique questions
  const selected = pool.slice(0, count);

  // Deep clone selected questions so attempts cannot mutate question properties
  return selected.map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? q.options.map((opt) => ({ ...opt })) : [],
  }));
}

/**
 * Generates a fresh mock test attempt for a given set number (1 to 50).
 * Randomly picks exactly 50 distinct questions from the 140-question bank.
 */
export async function createMockTestAttempt(setNumber) {
  const bank = await getQuestionBank();
  const selectedQuestions = sampleWithoutReplacement(bank, QUESTIONS_PER_TEST);

  const parsedSetNumber = Number(setNumber);
  const formattedSetNumber = String(parsedSetNumber).padStart(2, '0');
  const now = Date.now();
  const attemptId = `mock_set_${formattedSetNumber}_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const deadline = now + DURATION_MINUTES * 60 * 1000;

  // Initialize answer records for each of the 50 questions
  const initialAnswers = {};
  selectedQuestions.forEach((q, idx) => {
    initialAnswers[q.id] = {
      questionId: q.id,
      response: null,
      markedForReview: false,
      visited: idx === 0, // First question is visited initially
      timeSpentMs: 0,
    };
  });

  const attempt = {
    attemptId,
    setNumber: parsedSetNumber,
    setTitle: `Mock Test Set ${formattedSetNumber}`,
    totalQuestions: QUESTIONS_PER_TEST,
    durationMinutes: DURATION_MINUTES,
    startedAt: now,
    deadline,
    status: 'in-progress',
    questions: selectedQuestions,
    answers: initialAnswers,
    submittedAt: null,
    score: null,
    maxScore: QUESTIONS_PER_TEST,
    percentage: null,
    correctCount: 0,
    incorrectCount: 0,
    unansweredCount: QUESTIONS_PER_TEST,
    markedCount: 0,
  };

  saveMockAttempt(attempt);
  try {
    localStorage.setItem(`${ACTIVE_SET_PREFIX}${parsedSetNumber}`, attemptId);
  } catch {
    // Ignore localStorage quota errors
  }

  return attempt;
}

export const FULL_MOCK_CONFIG = {
  SET_IDENTIFIER: 'full',
  TITLE: 'Full Question Bank Mock Test',
  FULL_TITLE: 'Full Question Bank Mock Test (140 Questions)',
  SUBTITLE: 'Practice all 140 questions in one complete mock examination.',
  TOTAL_QUESTIONS: 140,
  DURATION_MINUTES: 180,
  TOTAL_MARKS: 140,
  NEGATIVE_MARKING: 'None',
  ACCESS: 'Open access, no sign-in required',
};

/**
 * Generates a full 140-question mock test attempt using all questions in the bank.
 * Questions are randomized in order for each new attempt without altering original question data.
 */
export async function createFullMockTestAttempt() {
  const bank = await getQuestionBank();
  const totalCount = bank.length;

  if (totalCount === 0) {
    throw new Error('Question bank is empty. Cannot initiate full mock test.');
  }

  // Fisher-Yates random shuffle of all 140 questions without modifying original bank
  const selectedQuestions = sampleWithoutReplacement(bank, totalCount);

  const now = Date.now();
  const attemptId = `mock_set_full_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const deadline = now + FULL_MOCK_CONFIG.DURATION_MINUTES * 60 * 1000;

  // Initialize answer tracking records for all 140 questions
  const initialAnswers = {};
  selectedQuestions.forEach((q, idx) => {
    initialAnswers[q.id] = {
      questionId: q.id,
      response: null,
      markedForReview: false,
      visited: idx === 0, // First question visited initially
      timeSpentMs: 0,
    };
  });

  const attempt = {
    attemptId,
    setNumber: FULL_MOCK_CONFIG.SET_IDENTIFIER,
    setTitle: FULL_MOCK_CONFIG.FULL_TITLE,
    totalQuestions: totalCount,
    durationMinutes: FULL_MOCK_CONFIG.DURATION_MINUTES,
    startedAt: now,
    deadline,
    status: 'in-progress',
    questions: selectedQuestions,
    answers: initialAnswers,
    submittedAt: null,
    score: null,
    maxScore: totalCount,
    percentage: null,
    correctCount: 0,
    incorrectCount: 0,
    unansweredCount: totalCount,
    markedCount: 0,
  };

  saveMockAttempt(attempt);
  try {
    localStorage.setItem(`${ACTIVE_SET_PREFIX}${FULL_MOCK_CONFIG.SET_IDENTIFIER}`, attemptId);
  } catch {
    // Ignore localStorage quota errors
  }

  return attempt;
}

/**
 * Retrieves summary status and previous performance metrics for the Full Mock Test.
 */
export function getFullMockSummary() {
  const historyRaw = (() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  })();

  const fullHistory = historyRaw.filter((h) => String(h.setNumber) === FULL_MOCK_CONFIG.SET_IDENTIFIER);
  const activeAttempt = getActiveAttemptForSet(FULL_MOCK_CONFIG.SET_IDENTIFIER);

  const bestPercentage = fullHistory.length > 0
    ? Math.max(...fullHistory.map((h) => h.percentage || 0))
    : null;
  const latestAttempt = fullHistory[0] || null;

  return {
    ...FULL_MOCK_CONFIG,
    hasActiveAttempt: !!activeAttempt,
    activeAttemptId: activeAttempt ? activeAttempt.attemptId : null,
    activeAttemptRemainingMs: activeAttempt ? Math.max(0, activeAttempt.deadline - Date.now()) : 0,
    attemptsCount: fullHistory.length,
    bestPercentage,
    latestScore: latestAttempt ? latestAttempt.score : null,
    latestPercentage: latestAttempt ? latestAttempt.percentage : null,
    latestSubmittedAt: latestAttempt ? latestAttempt.submittedAt : null,
  };
}

/**
 * Saves a mock test attempt into localStorage.
 */
export function saveMockAttempt(attempt) {
  if (!attempt || !attempt.attemptId) return;
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${attempt.attemptId}`,
      JSON.stringify(attempt)
    );
  } catch (err) {
    console.error('Failed to save mock test attempt to localStorage:', err);
  }
}

/**
 * Retrieves a mock test attempt by ID from localStorage.
 */
export function getMockAttempt(attemptId) {
  if (!attemptId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${attemptId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Checks for an active, unexpired attempt for a given set number or identifier (e.g. 1..50, 'full').
 */
export function getActiveAttemptForSet(setNumber) {
  try {
    const setKey = String(setNumber);
    const attemptId = localStorage.getItem(`${ACTIVE_SET_PREFIX}${setKey}`);
    if (!attemptId) return null;

    const attempt = getMockAttempt(attemptId);
    if (!attempt) return null;

    if (attempt.status === 'in-progress') {
      const now = Date.now();
      if (now < attempt.deadline) {
        return attempt;
      }
      // If deadline has expired, auto-submit and return
      return submitMockAttempt(attemptId, attempt.answers);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Evaluates and finalizes a mock test attempt:
 * - 1 mark per correct answer
 * - 0 marks for incorrect or unattempted
 * - No negative marking
 */
export function submitMockAttempt(attemptId, finalAnswers) {
  const attempt = getMockAttempt(attemptId);
  if (!attempt) {
    throw new Error(`Attempt ${attemptId} not found`);
  }

  const answersMap = finalAnswers || attempt.answers || {};
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let markedCount = 0;

  const questionsReview = attempt.questions.map((q, index) => {
    const ansRecord = answersMap[q.id] || {
      response: null,
      markedForReview: false,
      visited: false,
    };

    const userSelected = ansRecord.response;
    const isAnswered = userSelected !== null && userSelected !== undefined && userSelected !== '';
    const isCorrect = isAnswered && String(userSelected).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();

    if (isAnswered) {
      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    } else {
      unansweredCount++;
    }

    if (ansRecord.markedForReview) {
      markedCount++;
    }

    return {
      index: index + 1,
      id: q.id,
      questionNumber: q.questionNumber,
      stem: q.stem,
      options: q.options,
      correctAnswer: q.correctAnswer,
      userAnswer: userSelected,
      isCorrect,
      isAnswered,
      markedForReview: !!ansRecord.markedForReview,
      subject: q.subject || 'Psychology',
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'medium',
      marksAwarded: isCorrect ? 1 : 0,
      marksPossible: 1,
      explanation: q.explanation || '',
    };
  });

  const score = correctCount;
  const maxScore = attempt.questions.length;
  const percentage = Math.round((score / maxScore) * 1000) / 10; // 1 decimal place

  const finalizedAttempt = {
    ...attempt,
    answers: answersMap,
    status: 'completed',
    submittedAt: Date.now(),
    score,
    maxScore,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
    markedCount,
    questionsReview,
  };

  saveMockAttempt(finalizedAttempt);

  // Clear active attempt pointer for this set
  try {
    localStorage.removeItem(`${ACTIVE_SET_PREFIX}${attempt.setNumber}`);
  } catch {
    // Ignore
  }

  // Update history ledger
  recordAttemptInHistory(finalizedAttempt);

  return finalizedAttempt;
}

/**
 * Appends finalized attempt summary to persistent history.
 */
function recordAttemptInHistory(attempt) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];

    const summary = {
      attemptId: attempt.attemptId,
      setNumber: attempt.setNumber,
      setTitle: attempt.setTitle,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      submittedAt: attempt.submittedAt,
    };

    history.unshift(summary);
    // Keep last 100 attempts
    const trimmed = history.slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to update mock test history:', err);
  }
}

/**
 * Returns performance summary for all 50 sets.
 */
export function getAllSetsSummary() {
  const historyRaw = (() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  })();

  const sets = [];
  for (let i = 1; i <= TOTAL_SETS; i++) {
    const activeAttemptId = (() => {
      try {
        return localStorage.getItem(`${ACTIVE_SET_PREFIX}${i}`);
      } catch {
        return null;
      }
    })();

    let activeAttempt = null;
    if (activeAttemptId) {
      const stored = getMockAttempt(activeAttemptId);
      if (stored && stored.status === 'in-progress' && Date.now() < stored.deadline) {
        activeAttempt = stored;
      }
    }

    const setHistory = historyRaw.filter((h) => h.setNumber === i);
    const bestPercentage = setHistory.length > 0
      ? Math.max(...setHistory.map((h) => h.percentage || 0))
      : null;
    const latestAttempt = setHistory[0] || null;

    sets.push({
      setNumber: i,
      title: `Mock Test Set ${String(i).padStart(2, '0')}`,
      totalQuestions: QUESTIONS_PER_TEST,
      durationMinutes: DURATION_MINUTES,
      hasActiveAttempt: !!activeAttempt,
      activeAttemptId: activeAttempt ? activeAttempt.attemptId : null,
      attemptsCount: setHistory.length,
      bestPercentage,
      latestScore: latestAttempt ? latestAttempt.score : null,
      latestPercentage: latestAttempt ? latestAttempt.percentage : null,
      latestSubmittedAt: latestAttempt ? latestAttempt.submittedAt : null,
    });
  }

  return sets;
}

export const MOCK_TEST_CONFIG = {
  TOTAL_SETS,
  QUESTIONS_PER_TEST,
  DURATION_MINUTES,
  TOTAL_BANK_QUESTIONS: 140,
};

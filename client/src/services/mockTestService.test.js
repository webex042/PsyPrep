import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBundledQuestionBank,
  sampleWithoutReplacement,
  createMockTestAttempt,
  createFullMockTestAttempt,
  saveMockAttempt,
  getMockAttempt,
  submitMockAttempt,
  getAllSetsSummary,
  getFullMockSummary,
  MOCK_TEST_CONFIG,
  FULL_MOCK_CONFIG,
} from './mockTestService';

describe('Mock Test Service & Question Bank Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('contains exactly 140 unique questions in the central question bank', () => {
    const bank = getBundledQuestionBank();
    expect(bank).toHaveLength(140);

    const ids = new Set(bank.map((q) => q.id));
    expect(ids.size).toBe(140);

    // Verify all questions have stems, options, and correctAnswer
    bank.forEach((q) => {
      expect(q.stem).toBeTruthy();
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctAnswer).toBeTruthy();
    });
  });

  it('samples exactly 50 distinct questions without replacement and does not mutate the source', () => {
    const bank = getBundledQuestionBank();
    const originalStems = bank.map((q) => q.stem);

    const sampled = sampleWithoutReplacement(bank, 50);

    expect(sampled).toHaveLength(50);

    // Check no duplicate IDs within the 50 sampled questions
    const sampledIds = new Set(sampled.map((q) => q.id));
    expect(sampledIds.size).toBe(50);

    // Verify all 50 questions come from original bank
    sampled.forEach((q) => {
      expect(originalStems).toContain(q.stem);
    });

    // Check source array was NOT mutated
    expect(bank).toHaveLength(140);
    expect(bank.map((q) => q.stem)).toEqual(originalStems);
  });

  it('generates distinct selections and random orders across multiple test generations', () => {
    const bank = getBundledQuestionBank();

    const sample1 = sampleWithoutReplacement(bank, 50);
    const sample2 = sampleWithoutReplacement(bank, 50);

    const ids1 = sample1.map((q) => q.id).join(',');
    const ids2 = sample2.map((q) => q.id).join(',');

    // Probability of 50 randomly sampled items from 140 in identical order is essentially 0
    expect(ids1).not.toBe(ids2);
  });

  it('creates, persists, and retrieves a valid 50-question mock test attempt', async () => {
    const attempt = await createMockTestAttempt(1);

    expect(attempt.setNumber).toBe(1);
    expect(attempt.setTitle).toBe('Mock Test Set 01');
    expect(attempt.questions).toHaveLength(50);
    expect(attempt.durationMinutes).toBe(60);
    expect(attempt.status).toBe('in-progress');

    // Retrieve from localStorage
    const retrieved = getMockAttempt(attempt.attemptId);
    expect(retrieved).not.toBeNull();
    expect(retrieved.attemptId).toBe(attempt.attemptId);
    expect(retrieved.questions).toHaveLength(50);
  });

  it('correctly calculates score, percentage, and counts without negative marking', async () => {
    const attempt = await createMockTestAttempt(2);

    // Answer 3 questions correctly, 2 incorrectly, and leave 45 unanswered
    const answers = {};
    const q1 = attempt.questions[0];
    const q2 = attempt.questions[1];
    const q3 = attempt.questions[2];
    const q4 = attempt.questions[3];
    const q5 = attempt.questions[4];

    answers[q1.id] = { response: q1.correctAnswer, markedForReview: false, visited: true };
    answers[q2.id] = { response: q2.correctAnswer, markedForReview: false, visited: true };
    answers[q3.id] = { response: q3.correctAnswer, markedForReview: true, visited: true };
    answers[q4.id] = { response: 'WRONG_ANSWER_KEY', markedForReview: false, visited: true };
    answers[q5.id] = { response: 'ANOTHER_WRONG_KEY', markedForReview: false, visited: true };

    const result = submitMockAttempt(attempt.attemptId, answers);

    expect(result.status).toBe('completed');
    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(50);
    expect(result.percentage).toBe(6.0); // (3/50)*100 = 6%
    expect(result.correctCount).toBe(3);
    expect(result.incorrectCount).toBe(2);
    expect(result.unansweredCount).toBe(45);
    expect(result.markedCount).toBe(1);
  });

  it('provides status and summary for all 50 mock test sets', () => {
    const sets = getAllSetsSummary();
    expect(sets).toHaveLength(50);
    expect(sets[0].title).toBe('Mock Test Set 01');
    expect(sets[49].title).toBe('Mock Test Set 50');
    expect(sets[0].totalQuestions).toBe(50);
  });

  it('creates, persists, and retrieves a full 140-question mock test attempt with 180 mins duration', async () => {
    const attempt = await createFullMockTestAttempt();

    expect(attempt.setNumber).toBe('full');
    expect(attempt.setTitle).toBe('Full Question Bank Mock Test (140 Questions)');
    expect(attempt.totalQuestions).toBe(140);
    expect(attempt.durationMinutes).toBe(180);
    expect(attempt.maxScore).toBe(140);
    expect(attempt.status).toBe('in-progress');
    expect(attempt.questions).toHaveLength(140);

    // Verify all 140 questions are unique
    const uniqueIds = new Set(attempt.questions.map((q) => q.id));
    expect(uniqueIds.size).toBe(140);

    // Verify localStorage persistence
    const retrieved = getMockAttempt(attempt.attemptId);
    expect(retrieved).not.toBeNull();
    expect(retrieved.attemptId).toBe(attempt.attemptId);
    expect(retrieved.questions).toHaveLength(140);
  });

  it('evaluates a full 140-question mock test submission and updates full mock summary', async () => {
    const attempt = await createFullMockTestAttempt();

    // Answer first 80 questions correctly, 20 incorrectly, leave 40 unanswered
    const answers = {};
    for (let i = 0; i < 140; i++) {
      const q = attempt.questions[i];
      if (i < 80) {
        answers[q.id] = { response: q.correctAnswer, markedForReview: false, visited: true };
      } else if (i < 100) {
        answers[q.id] = { response: 'INCORRECT_CHOICE', markedForReview: true, visited: true };
      } else {
        answers[q.id] = { response: null, markedForReview: false, visited: false };
      }
    }

    const result = submitMockAttempt(attempt.attemptId, answers);

    expect(result.status).toBe('completed');
    expect(result.score).toBe(80);
    expect(result.maxScore).toBe(140);
    expect(result.correctCount).toBe(80);
    expect(result.incorrectCount).toBe(20);
    expect(result.unansweredCount).toBe(40);
    expect(result.markedCount).toBe(20);
    expect(result.percentage).toBe(57.1); // (80/140)*100 = 57.14 -> 57.1%
    expect(result.questionsReview).toHaveLength(140);

    // Verify getFullMockSummary reflects the completed attempt
    const summary = getFullMockSummary();
    expect(summary.attemptsCount).toBe(1);
    expect(summary.latestScore).toBe(80);
    expect(summary.bestPercentage).toBe(57.1);
    expect(summary.hasActiveAttempt).toBe(false);
  });
});

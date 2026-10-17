import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Pure test helper for question palette status transitions
function getQuestionStatus(record) {
  if (!record || !record.visited) return 'unvisited';
  const isAnswered = record.response !== null && record.response !== undefined;
  if (isAnswered && record.markedForReview) return 'answered-marked';
  if (record.markedForReview) return 'marked';
  if (isAnswered) return 'answered';
  return 'visited';
}

// Pure helper for submit confirmation counts
function computeSubmitSummary(questions, answers) {
  let answered = 0;
  let marked = 0;
  let unvisited = 0;
  let visited = 0;

  questions.forEach((q) => {
    const rec = answers[q.id];
    const status = getQuestionStatus(rec);
    if (status === 'answered' || status === 'answered-marked') answered++;
    if (status === 'marked' || status === 'answered-marked') marked++;
    if (status === 'unvisited') unvisited++;
    if (status === 'visited') visited++;
  });

  return {
    total: questions.length,
    answered,
    unanswered: questions.length - answered,
    marked,
    unvisited,
    visited,
  };
}

describe('Question Palette & Submit Confirmation Logic', () => {
  it('correctly transitions palette states', () => {
    // 1. Unvisited
    expect(getQuestionStatus(undefined)).toBe('unvisited');
    expect(getQuestionStatus({ visited: false })).toBe('unvisited');

    // 2. Visited (seen, but not answered)
    expect(getQuestionStatus({ visited: true, response: null, markedForReview: false })).toBe('visited');

    // 3. Answered
    expect(getQuestionStatus({ visited: true, response: 'A', markedForReview: false })).toBe('answered');

    // 4. Marked for review (unanswered)
    expect(getQuestionStatus({ visited: true, response: null, markedForReview: true })).toBe('marked');

    // 5. Answered + Marked for review
    expect(getQuestionStatus({ visited: true, response: 'C', markedForReview: true })).toBe('answered-marked');
  });

  it('accurately computes submit confirmation counts', () => {
    const sampleQuestions = [
      { id: 'q_1' },
      { id: 'q_2' },
      { id: 'q_3' },
      { id: 'q_4' },
      { id: 'q_5' },
    ];

    const sampleAnswers = {
      q_1: { visited: true, response: 'A', markedForReview: false }, // answered
      q_2: { visited: true, response: 'B', markedForReview: true },  // answered + marked
      q_3: { visited: true, response: null, markedForReview: true }, // marked
      q_4: { visited: true, response: null, markedForReview: false },// visited
      // q_5 unvisited
    };

    const summary = computeSubmitSummary(sampleQuestions, sampleAnswers);

    expect(summary.total).toBe(5);
    expect(summary.answered).toBe(2); // q_1, q_2
    expect(summary.unanswered).toBe(3); // q_3, q_4, q_5
    expect(summary.marked).toBe(2); // q_2, q_3
    expect(summary.unvisited).toBe(1); // q_5
    expect(summary.visited).toBe(1); // q_4
  });

  it('accurately computes submit confirmation and palette summary for a full 140-question mock test', () => {
    const questions140 = Array.from({ length: 140 }, (_, i) => ({ id: `q_${i + 1}` }));
    const answers140 = {};

    // 100 answered (including 10 answered+marked), 15 marked without answer, 15 visited, 10 unvisited
    for (let i = 0; i < 90; i++) {
      answers140[`q_${i + 1}`] = { visited: true, response: 'A', markedForReview: false };
    }
    for (let i = 90; i < 100; i++) {
      answers140[`q_${i + 1}`] = { visited: true, response: 'B', markedForReview: true };
    }
    for (let i = 100; i < 115; i++) {
      answers140[`q_${i + 1}`] = { visited: true, response: null, markedForReview: true };
    }
    for (let i = 115; i < 130; i++) {
      answers140[`q_${i + 1}`] = { visited: true, response: null, markedForReview: false };
    }
    // 130 to 140 are unvisited

    const summary = computeSubmitSummary(questions140, answers140);
    expect(summary.total).toBe(140);
    expect(summary.answered).toBe(100);
    expect(summary.unanswered).toBe(40);
    expect(summary.marked).toBe(25); // 10 ans+marked + 15 marked
    expect(summary.visited).toBe(15);
    expect(summary.unvisited).toBe(10);
  });
});

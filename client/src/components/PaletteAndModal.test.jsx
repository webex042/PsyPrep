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
});

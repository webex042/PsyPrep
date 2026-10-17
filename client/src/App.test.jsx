import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('App root component (Open Access & 50 Mock Tests)', () => {
  it('renders application and loads Mock Test Dashboard directly without signing in', () => {
    render(<App />);

    // Renders primary heading without requiring login
    expect(
      screen.getByRole('heading', { name: /Psychology of Learning Mock Tests/i })
    ).toBeInTheDocument();

    // Verifies key metrics displayed
    expect(screen.getByText(/50-Set Computer-Based Mock Exam Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Mock Test Set 01/i)).toBeInTheDocument();
    expect(screen.getByText(/Mock Test Set 50/i)).toBeInTheDocument();

    // Verifies Full Question Bank Mock Test section is clearly visible
    expect(
      screen.getByRole('heading', { name: /Full Question Bank Mock Test/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Practice all 140 questions in one complete mock examination/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Start Full Mock Test/i })
    ).toBeInTheDocument();
  });
});

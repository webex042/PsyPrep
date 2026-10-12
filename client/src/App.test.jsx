import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('App root component', () => {
  it('renders application and loads initial view', () => {
    render(<App />);
    // When not logged in, redirects to login page showing PsyPrep
    expect(screen.getByRole('heading', { name: /PsyPrep/i })).toBeInTheDocument();
    expect(screen.getByText(/Online Mock Test & Quiz Engine/i)).toBeInTheDocument();
  });
});

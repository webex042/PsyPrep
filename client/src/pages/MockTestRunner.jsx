import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Check,
  Send,
  Menu,
  X,
  FileCheck2,
  Award,
} from 'lucide-react';
import {
  getMockAttempt,
  saveMockAttempt,
  submitMockAttempt,
  createMockTestAttempt,
  createFullMockTestAttempt,
} from '../services/mockTestService';

export function MockTestRunner() {
  const { setNumber, attemptId } = useParams();
  const navigate = useNavigate();

  // Test State
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteRange, setPaletteRange] = useState('all');

  const timerIntervalRef = useRef(null);
  const deadlineRef = useRef(null);
  const answersRef = useRef({});

  // Synchronize answers ref
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // 1. Initial Load & Rehydration
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        let currentAttempt = getMockAttempt(attemptId);

        // If not found or if set mismatch, create a new one
        if (!currentAttempt) {
          if (String(setNumber) === 'full') {
            currentAttempt = await createFullMockTestAttempt();
          } else {
            currentAttempt = await createMockTestAttempt(setNumber);
          }
          navigate(`/mock-test/${setNumber}/attempt/${currentAttempt.attemptId}`, {
            replace: true,
          });
          return;
        }

        // If already submitted, navigate to results
        if (currentAttempt.status === 'completed') {
          navigate(`/mock-test/${setNumber}/result/${currentAttempt.attemptId}`, {
            replace: true,
          });
          return;
        }

        setAttempt(currentAttempt);
        setQuestions(currentAttempt.questions || []);

        const initialAnswers = currentAttempt.answers || {};
        // Ensure first question is marked visited
        const firstQ = currentAttempt.questions?.[0];
        if (firstQ && initialAnswers[firstQ.id]) {
          initialAnswers[firstQ.id].visited = true;
        }
        setAnswers(initialAnswers);

        // Setup timer
        deadlineRef.current = currentAttempt.deadline;
        const now = Date.now();
        const diff = Math.max(0, Math.floor((currentAttempt.deadline - now) / 1000));
        setRemainingSeconds(diff);
      } catch (err) {
        console.error('Failed to load mock test attempt:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [setNumber, attemptId, navigate]);

  // 2. Countdown Timer
  useEffect(() => {
    if (!deadlineRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((deadlineRef.current - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(timerIntervalRef.current);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [attempt]);

  // Format MM:SS or HH:MM:SS
  const formatTime = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds < 0) return '00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Persist answers to state and localStorage
  const updateAnswer = (questionId, patch) => {
    setAnswers((prev) => {
      const currentRec = prev[questionId] || {
        questionId,
        response: null,
        markedForReview: false,
        visited: true,
        timeSpentMs: 0,
      };

      const updated = {
        ...currentRec,
        ...patch,
        visited: true,
      };

      const newAnswers = { ...prev, [questionId]: updated };

      if (attempt) {
        saveMockAttempt({
          ...attempt,
          answers: newAnswers,
        });
      }

      return newAnswers;
    });
  };

  // Option selection
  const handleSelectOption = (optionId) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const currentRec = answers[currentQ.id];
    // If clicking same option, deselect; otherwise select optionId
    const newResponse = currentRec?.response === optionId ? null : optionId;
    updateAnswer(currentQ.id, { response: newResponse });
  };

  // Toggle Mark for Review
  const handleToggleMarkForReview = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const currentRec = answers[currentQ.id];
    const isMarked = !!currentRec?.markedForReview;
    updateAnswer(currentQ.id, { markedForReview: !isMarked });
  };

  // Clear Response
  const handleClearResponse = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    updateAnswer(currentQ.id, { response: null });
  };

  // Navigation
  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return;

    // Mark destination question as visited
    const targetQ = questions[index];
    if (targetQ) {
      updateAnswer(targetQ.id, {});
    }

    setCurrentIndex(index);
    setPaletteOpen(false);
  };

  const handleSaveAndNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  // Submission handler with double-submit guard
  const handleFinalSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const finalized = submitMockAttempt(attempt.attemptId, answersRef.current);
      navigate(`/mock-test/${setNumber}/result/${finalized.attemptId}`, { replace: true });
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (attempt) {
        const finalized = submitMockAttempt(attempt.attemptId, answersRef.current);
        navigate(`/mock-test/${setNumber}/result/${finalized.attemptId}`, { replace: true });
      }
    } catch (err) {
      console.error('Auto-submit error:', err);
    }
  };

  if (loading) {
    const isFull = String(setNumber) === 'full';
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            {isFull
              ? 'Loading Full Question Bank Mock Test (140 Questions)...'
              : `Loading Mock Test Set ${String(setNumber).padStart(2, '0')}...`}
          </div>
          <div className="mt-1 text-xs text-[#66645F] font-mono">
            {isFull
              ? 'Randomizing all 140 examination questions without replacement'
              : 'Randomizing 50 examination questions without replacement'}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  // Compute palette summary counts
  const summaryCounts = questions.reduce(
    (acc, q) => {
      const rec = answers[q.id];
      if (!rec || !rec.visited) {
        acc.unvisited++;
        acc.totalUnanswered++;
        return acc;
      }
      const isAns = rec.response !== null && rec.response !== undefined && rec.response !== '';
      if (isAns && rec.markedForReview) {
        acc['answered-marked']++;
        acc.totalAnswered++;
      } else if (rec.markedForReview) {
        acc.marked++;
        acc.totalUnanswered++;
      } else if (isAns) {
        acc.answered++;
        acc.totalAnswered++;
      } else {
        acc.visited++;
        acc.totalUnanswered++;
      }
      return acc;
    },
    {
      answered: 0,
      marked: 0,
      'answered-marked': 0,
      visited: 0,
      unvisited: 0,
      totalAnswered: 0,
      totalUnanswered: 0,
    }
  );

  const isTimeCritical = remainingSeconds !== null && remainingSeconds < 300; // Under 5 mins
  const isTimeUrgent = remainingSeconds !== null && remainingSeconds < 60; // Under 1 min

  return (
    <div className="space-y-4 pb-12">
      {/* Top Swiss Academic Test Bar */}
      <div className="swiss-card bg-[#FFFFFF] p-3 sm:p-4 shadow-sm border border-[#D9D2C5]">
        <div className="flex items-center justify-between gap-3">
          {/* Test and Question Breadcrumb */}
          <div className="flex items-center space-x-3 truncate">
            <Link
              to="/"
              className="text-xs font-mono text-[#66645F] hover:text-[#191919] flex items-center space-x-1"
              title="Return to Dashboard"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sets</span>
            </Link>
            <span className="text-[#D9D2C5]">/</span>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg text-[#191919] leading-tight truncate">
                {attempt?.setTitle || `Mock Test Set ${setNumber}`}
              </h1>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-[#66645F]">
                <span className="font-semibold text-[#191919]">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span>•</span>
                <span>{attempt?.durationMinutes || (String(setNumber) === 'full' ? 180 : 60)} Mins Timed CBT</span>
                <span>•</span>
                <span>No Negative Marking</span>
              </div>
            </div>
          </div>

          {/* Timer & Submit Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Countdown Clock Display */}
            <div
              className={`px-3 py-1.5 border rounded-[2px] flex items-center space-x-1.5 font-mono font-bold text-xs sm:text-sm tracking-wider ${
                isTimeUrgent
                  ? 'bg-[#FDF2EC] text-[#C04A26] border-[#C04A26] animate-pulse'
                  : isTimeCritical
                  ? 'bg-[#FDF2EC] text-[#D96836] border-[#D96836]'
                  : 'bg-[#FAF7F0] text-[#191919] border-[#D9D2C5]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#66645F]" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Final Submit Button */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className="py-1.5 px-3.5 btn-primary-orange text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Submit Test</span>
              <span className="sm:hidden">Submit</span>
            </button>

            {/* Mobile Palette Toggle */}
            <button
              onClick={() => setPaletteOpen(!paletteOpen)}
              className="lg:hidden p-1.5 bg-[#FFFFFF] border border-[#D9D2C5] rounded-[2px] text-[#191919]"
              aria-label="Toggle Question Palette"
            >
              {paletteOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Runner Body: Question Card (8 Cols) + Palette (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: CBT Question Area (8 Cols) */}
        <section className="lg:col-span-8 flex flex-col space-y-4">
          {currentQuestion && (
            <div className="swiss-card p-6 sm:p-8 bg-[#FFFFFF] shadow-sm">
              {/* Question Header Strip */}
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#D9D2C5] gap-3">
                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="px-2.5 py-1 bg-[#191919] text-white font-bold rounded-[2px]">
                    Q. {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-[#66645F] font-semibold">
                    [+1.00 Mark / 0.00]
                  </span>
                  <span className="swiss-tag bg-[#FAF7F0] text-[#191919]">
                    {currentQuestion.topic || currentQuestion.subject || 'Psychology'}
                  </span>
                  <span className="swiss-tag bg-[#FAF7F0] text-[#66645F] uppercase">
                    {currentQuestion.difficulty || 'medium'}
                  </span>
                </div>

                {/* Mark for Review Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMarkForReview}
                  className={`px-3 py-1 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all rounded-[2px] border ${
                    currentAnswer?.markedForReview
                      ? 'bg-[#FDF2EC] border-[#D96836] text-[#D96836]'
                      : 'bg-[#FFFFFF] border-[#D9D2C5] text-[#66645F] hover:border-[#191919] hover:text-[#191919]'
                  }`}
                >
                  <Flag className="w-3 h-3 fill-current" />
                  <span>
                    {currentAnswer?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </span>
                </button>
              </div>

              {/* Question Stem Statement */}
              <div className="py-6">
                <h2 className="font-display font-medium text-base sm:text-lg text-[#191919] leading-relaxed select-none">
                  {currentQuestion.stem}
                </h2>
              </div>

              {/* Options List (Radio / Selectable Cards) */}
              <div className="space-y-3 font-sans">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentAnswer?.response === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOption(option.id)}
                      className={`cbt-option w-full text-left p-3.5 sm:p-4 flex items-start space-x-3.5 cursor-pointer ${
                        isSelected ? 'selected' : ''
                      }`}
                    >
                      <div
                        className={`w-6 h-6 border flex items-center justify-center font-mono font-bold text-xs shrink-0 select-none rounded-full transition-colors ${
                          isSelected
                            ? 'bg-[#D96836] border-[#D96836] text-white'
                            : 'bg-white border-[#D9D2C5] text-[#66645F]'
                        }`}
                      >
                        {option.id}
                      </div>
                      <div className="text-xs sm:text-sm text-[#191919] pt-0.5 leading-relaxed font-normal">
                        {option.text}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Clear Response Action */}
              {currentAnswer?.response && (
                <div className="mt-5 pt-3 border-t border-[#D9D2C5] flex justify-end font-mono text-xs">
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="text-[#66645F] hover:text-[#D96836] flex items-center space-x-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Selected Response</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls Bar */}
          <div className="swiss-card p-3 sm:p-4 bg-[#FFFFFF] shadow-sm flex items-center justify-between gap-3 font-display text-xs">
            <button
              type="button"
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="py-2 px-4 btn-secondary-neutral flex items-center space-x-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-2">
              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="py-2 px-5 btn-primary-orange flex items-center space-x-1.5"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="py-2 px-5 btn-primary-orange flex items-center space-x-1.5"
                >
                  <span>Review & Submit</span>
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Right: Question Navigation Palette Sidebar (4 Cols) */}
        <aside
          className={`lg:col-span-4 lg:block swiss-card bg-[#FFFFFF] shadow-sm p-4 sm:p-5 ${
            paletteOpen
              ? 'fixed inset-x-3 top-20 bottom-4 z-40 overflow-y-auto block'
              : 'hidden'
          }`}
        >
          {/* Palette Header */}
          <div className="pb-3 border-b border-[#D9D2C5] flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-[#191919]">
              Question Navigation Palette
            </h3>
            <span className="font-mono text-xs text-[#66645F]">
              {summaryCounts.totalAnswered} / {questions.length} Answered
            </span>
          </div>

          {/* Legend Badges */}
          <div className="grid grid-cols-2 gap-2 py-3.5 border-b border-[#D9D2C5] font-mono text-[11px] text-[#66645F]">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-[#65715B] rounded-[2px]" />
              <span>Answered ({summaryCounts.answered})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-[#D96836] rounded-[2px]" />
              <span>Marked ({summaryCounts.marked})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-[#65715B] border border-[#D96836] rounded-[2px]" />
              <span>Ans + Marked ({summaryCounts['answered-marked']})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-[#F5F0E6] border border-[#D9D2C5] rounded-[2px]" />
              <span>Visited ({summaryCounts.visited})</span>
            </div>
            <div className="flex items-center space-x-2 col-span-2">
              <span className="w-3 h-3 bg-white border border-[#D9D2C5] rounded-[2px]" />
              <span>Not Visited ({summaryCounts.unvisited})</span>
            </div>
          </div>

          {/* Quick Range Jumps for 140-Question Mock Test */}
          {questions.length > 50 && (
            <div className="flex items-center gap-1 py-2.5 border-b border-[#D9D2C5] overflow-x-auto text-[11px] font-mono">
              <span className="text-[#66645F] text-[10px] uppercase font-bold shrink-0 mr-1">Section:</span>
              {[
                { id: 'all', label: `All (${questions.length})` },
                { id: '1-35', label: '1–35' },
                { id: '36-70', label: '36–70' },
                { id: '71-105', label: '71–105' },
                { id: '106-140', label: '106–140' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaletteRange(tab.id)}
                  className={`px-2 py-0.5 rounded-[2px] transition-all whitespace-nowrap ${
                    paletteRange === tab.id
                      ? 'bg-[#191919] text-white font-bold'
                      : 'bg-[#FAF7F0] text-[#66645F] hover:bg-[#F0ECE1]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Palette Numerical Grid (1–140 or 1–50) */}
          <div className="pt-3">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 gap-1.5 max-h-[440px] overflow-y-auto pr-1 font-mono text-xs">
              {questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ idx }) => {
                  if (paletteRange === '1-35') return idx >= 0 && idx < 35;
                  if (paletteRange === '36-70') return idx >= 35 && idx < 70;
                  if (paletteRange === '71-105') return idx >= 70 && idx < 105;
                  if (paletteRange === '106-140') return idx >= 105 && idx < 140;
                  return true;
                })
                .map(({ q, idx }) => {
                  const rec = answers[q.id];
                  const isCurrent = idx === currentIndex;
                  const isVisited = !!rec?.visited;
                  const isAnswered = rec?.response !== null && rec?.response !== undefined && rec?.response !== '';
                  const isMarked = !!rec?.markedForReview;

                  // Derive button style class
                  let btnStyle = 'bg-white text-[#66645F] border-[#D9D2C5]';
                  if (isAnswered && isMarked) {
                    btnStyle = 'bg-[#65715B] text-white border-2 border-[#D96836] font-bold';
                  } else if (isMarked) {
                    btnStyle = 'bg-[#D96836] text-white border-[#D96836] font-bold';
                  } else if (isAnswered) {
                    btnStyle = 'bg-[#65715B] text-white border-[#65715B] font-bold';
                  } else if (isVisited) {
                    btnStyle = 'bg-[#F5F0E6] text-[#191919] border-[#D9D2C5]';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={`h-8 rounded-[2px] border text-xs flex items-center justify-center transition-all ${btnStyle} ${
                        isCurrent ? 'ring-2 ring-[#191919] scale-105 z-10' : ''
                      }`}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
            </div>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#191919]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="swiss-card bg-white max-w-md w-full p-6 shadow-xl border border-[#D9D2C5] space-y-4">
            <div className="flex items-center space-x-2 text-[#D96836]">
              <FileCheck2 className="w-5 h-5" />
              <h3 className="font-display font-bold text-lg text-[#191919]">
                Submit {attempt?.setTitle || (String(setNumber) === 'full' ? 'Full Question Bank Mock Test (140 Questions)' : `Mock Test Set ${String(setNumber).padStart(2, '0')}`)}
              </h3>
            </div>

            <p className="text-xs text-[#66645F] leading-relaxed font-sans">
              Are you sure you want to finalize your submission? You will immediately receive your score, accuracy metrics, and question-by-question solutions.
            </p>

            {/* Candidate Submission Ledger */}
            <div className="p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#66645F]">Total Questions:</span>
                <span className="font-bold text-[#191919]">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#65715B]">Answered:</span>
                <span className="font-bold text-[#65715B]">{summaryCounts.totalAnswered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66645F]">Unanswered / Skipped:</span>
                <span className="font-bold text-[#191919]">{summaryCounts.totalUnanswered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#D96836]">Marked for Review:</span>
                <span className="font-bold text-[#D96836]">{summaryCounts.marked + summaryCounts['answered-marked']}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#D9D2C5]">
                <span className="text-[#66645F]">Time Remaining:</span>
                <span className="font-bold text-[#191919]">{formatTime(remainingSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 font-display text-xs">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="py-2 px-4 btn-secondary-neutral"
              >
                Cancel & Continue Test
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="py-2 px-5 btn-primary-orange flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Yes, Submit Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

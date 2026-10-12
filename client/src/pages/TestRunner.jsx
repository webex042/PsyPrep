import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
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
} from 'lucide-react';

export function TestRunner() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  // Test State
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: { response, markedForReview, visited, timeSpentMs } }
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Time tracking ref for current question
  const questionStartTimeRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);
  const deadlineRef = useRef(null);

  // 1. Initial Load & Rehydration mid-test
  useEffect(() => {
    async function loadAttempt() {
      try {
        setLoading(true);
        setError('');
        const data = await api.get(`/api/attempts/${attemptId}`);

        if (data.attempt.status !== 'in-progress') {
          // Already finalized -> navigate to results
          navigate(`/test/${attemptId}/result`, { replace: true });
          return;
        }

        setAttempt(data.attempt);
        setQuiz(data.quiz);
        setQuestions(data.quiz.questions || []);

        // Rehydrate answers map
        const initialAnswersMap = {};
        (data.attempt.answers || []).forEach((a) => {
          const qId = a.question?._id || a.question;
          initialAnswersMap[qId] = {
            response: a.response,
            markedForReview: !!a.markedForReview,
            visited: !!a.visited,
            timeSpentMs: a.timeSpentMs || 0,
          };
        });

        // Ensure current question is marked visited
        const firstQId = data.quiz.questions?.[0]?._id;
        if (firstQId && initialAnswersMap[firstQId]) {
          initialAnswersMap[firstQId].visited = true;
        }

        setAnswers(initialAnswersMap);

        // Compute deadline and remaining seconds from authoritative server deadline
        const deadlineDate = new Date(data.attempt.deadline);
        deadlineRef.current = deadlineDate;
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((deadlineDate.getTime() - now) / 1000));
        setRemainingSeconds(diffSeconds);

        questionStartTimeRef.current = Date.now();
      } catch (err) {
        setError(err.message || 'Failed to initialize CBT runner');
      } finally {
        setLoading(false);
      }
    }

    loadAttempt();
  }, [attemptId, navigate]);

  // 2. Countdown Timer hook derived from server deadline
  useEffect(() => {
    if (!deadlineRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((deadlineRef.current.getTime() - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(timerIntervalRef.current);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, []);

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

  // 3. Autosave answer to server
  const saveAnswerToServer = useCallback(
    async (questionId, newAnswerState) => {
      setSaveStatus('saving');
      try {
        await api.patch(`/api/attempts/${attemptId}/answers`, {
          questionId,
          response: newAnswerState.response,
          markedForReview: newAnswerState.markedForReview,
          visited: true,
          timeSpentMs: newAnswerState.additionalTimeMs || 0,
        });
        setSaveStatus('saved');
      } catch (err) {
        if (err.status === 403 && err.raw?.error?.code === 'DEADLINE_EXCEEDED') {
          handleAutoSubmit();
        } else {
          setSaveStatus('error');
        }
      }
    },
    [attemptId]
  );

  // Record time spent on question before switching
  const flushCurrentQuestionTime = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return 0;

    const elapsedMs = Date.now() - questionStartTimeRef.current;
    questionStartTimeRef.current = Date.now();
    return elapsedMs;
  };

  // Handle option select
  const handleSelectOption = (optionId) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ._id;
    const prev = answers[qId] || {
      response: null,
      markedForReview: false,
      visited: true,
      timeSpentMs: 0,
    };

    const updated = {
      ...prev,
      response: prev.response === optionId ? null : optionId, // click again to deselect
      visited: true,
    };

    setAnswers((old) => ({ ...old, [qId]: updated }));
    saveAnswerToServer(qId, { ...updated, additionalTimeMs: 0 });
  };

  // Handle Mark for Review toggle
  const handleToggleMarkForReview = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ._id;
    const prev = answers[qId] || {
      response: null,
      markedForReview: false,
      visited: true,
      timeSpentMs: 0,
    };

    const updated = {
      ...prev,
      markedForReview: !prev.markedForReview,
      visited: true,
    };

    setAnswers((old) => ({ ...old, [qId]: updated }));
    saveAnswerToServer(qId, { ...updated, additionalTimeMs: 0 });
  };

  // Clear current response
  const handleClearResponse = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const qId = currentQ._id;
    const prev = answers[qId] || {};
    const updated = { ...prev, response: null, visited: true };

    setAnswers((old) => ({ ...old, [qId]: updated }));
    saveAnswerToServer(qId, { ...updated, additionalTimeMs: 0 });
  };

  // Navigate to question index
  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return;

    const timeSpent = flushCurrentQuestionTime();
    const currentQ = questions[currentIndex];
    if (currentQ) {
      const qId = currentQ._id;
      const prev = answers[qId] || { response: null, markedForReview: false, visited: true };
      saveAnswerToServer(qId, { ...prev, additionalTimeMs: timeSpent });
    }

    // Mark target as visited
    const targetQ = questions[index];
    if (targetQ) {
      const tId = targetQ._id;
      setAnswers((old) => ({
        ...old,
        [tId]: { ...(old[tId] || {}), visited: true },
      }));
    }

    setCurrentIndex(index);
    questionStartTimeRef.current = Date.now();
    setPaletteOpen(false);
  };

  // Handle Save & Next
  const handleSaveAndNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  // Final Submit
  const handleSubmitTest = async () => {
    setSubmitting(true);
    try {
      flushCurrentQuestionTime();
      await api.post(`/api/attempts/${attemptId}/submit`, {});
      navigate(`/test/${attemptId}/result`, { replace: true });
    } catch (err) {
      setError(err.message || 'Submission failed');
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/attempts/${attemptId}/submit`, {});
    } catch {
      // Lazy auto-submit will finalize on access anyway
    }
    navigate(`/test/${attemptId}/result`, { replace: true });
  };

  // Derive palette item status
  const getQuestionStatus = (qId) => {
    const record = answers[qId];
    if (!record || !record.visited) return 'unvisited';
    const isAnswered = record.response !== null && record.response !== undefined;
    if (isAnswered && record.markedForReview) return 'answered-marked';
    if (record.markedForReview) return 'marked';
    if (isAnswered) return 'answered';
    return 'visited';
  };

  // Palette counts summary
  const summaryCounts = questions.reduce(
    (acc, q) => {
      const status = getQuestionStatus(q._id);
      acc[status] = (acc[status] || 0) + 1;
      if (answers[q._id]?.response !== null && answers[q._id]?.response !== undefined) {
        acc.totalAnswered++;
      } else {
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            INITIALIZING CBT RUNNER & SYNCHRONIZING TIME WITH SERVER...
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion._id] : null;
  const isTimeCritical = remainingSeconds !== null && remainingSeconds < 300; // Under 5 mins
  const isTimeUrgent = remainingSeconds !== null && remainingSeconds < 60; // Under 1 min

  return (
    <div className="space-y-4">
      {/* Professional CBT Header Bar */}
      <div className="swiss-card bg-[#FFFFFF] shadow-sm">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-[#D9D2C5]">
          {/* Exam Title & Current Item Info */}
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 bg-[#D96836] text-white flex items-center justify-center font-bold text-xs rounded-[2px]">
              Ψ
            </span>
            <div>
              <h1 className="font-display font-bold text-sm sm:text-base text-[#191919] truncate max-w-xs sm:max-w-md">
                {quiz?.title}
              </h1>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-[#66645F]">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>•</span>
                <span>Attempt #{attempt?.attemptNumber}</span>
              </div>
            </div>
          </div>

          {/* Sync Status & Countdown Clock */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Sync status */}
            <div className="hidden sm:flex items-center text-xs font-mono">
              {saveStatus === 'saving' && (
                <span className="text-[#D96836] flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#D96836] animate-pulse mr-1.5" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[#65715B] flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1 text-[#65715B]" />
                  Synced
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-[#C04A26] flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Sync Error
                </span>
              )}
            </div>

            {/* Countdown Clock Display */}
            <div
              className={`px-3 py-1.5 border rounded-[2px] flex items-center space-x-2 font-mono font-bold text-xs sm:text-sm tracking-wider ${
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

            {/* Final Submit Action */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className="py-1.5 px-3.5 btn-primary-orange text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Examination</span>
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

      {/* Main Runner Body: Question Card (8 Cols) + Question Palette (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Professional CBT Question Area (8 Cols) */}
        <section className="lg:col-span-8 flex flex-col space-y-4">
          {currentQuestion && (
            <div className="swiss-card p-6 sm:p-8 bg-[#FFFFFF] shadow-sm">
              {/* Question Header Strip */}
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#D9D2C5] gap-3">
                <div className="flex items-center space-x-2 font-mono text-xs">
                  <span className="px-2.5 py-1 bg-[#191919] text-white font-bold rounded-[2px]">
                    Q. {currentIndex + 1}
                  </span>
                  <span className="text-[#66645F]">
                    [+{currentQuestion.marks || quiz?.marksPerQuestion || 1} Mark]
                  </span>
                  <span className="swiss-tag bg-[#FAF7F0] text-[#191919]">
                    {currentQuestion.topic || currentQuestion.subject || 'General'}
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

              {/* Options List (Clean, selectable CBT rows) */}
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
                    <span>Clear Response</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls Bar — Swiss Grid */}
          <div className="swiss-card p-3 sm:p-4 bg-[#FFFFFF] shadow-sm flex items-center justify-between gap-3 font-display text-xs">
            <button
              type="button"
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="py-2 px-4 btn-secondary-neutral flex items-center space-x-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Question</span>
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

        {/* Right: Question Palette Sidebar (4 Cols) */}
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
              Question Palette
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
              <span>Ans+Marked ({summaryCounts['answered-marked']})</span>
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

          {/* Palette Numerical Grid */}
          <div className="pt-3">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 gap-1.5 max-h-[440px] overflow-y-auto pr-1 font-mono text-xs">
              {questions.map((q, idx) => {
                const status = getQuestionStatus(q._id);
                const isCurrent = idx === currentIndex;

                let badgeStyles = 'bg-white text-[#66645F] border-[#D9D2C5]'; // unvisited
                if (status === 'answered') {
                  badgeStyles = 'bg-[#65715B] text-white border-[#65715B] font-bold';
                } else if (status === 'marked') {
                  badgeStyles = 'bg-[#D96836] text-white border-[#D96836] font-bold';
                } else if (status === 'answered-marked') {
                  badgeStyles = 'bg-[#65715B] text-white border-2 border-[#D96836] font-bold';
                } else if (status === 'visited') {
                  badgeStyles = 'bg-[#FAF7F0] text-[#191919] border-[#B8B0A2]';
                }

                return (
                  <button
                    key={q._id}
                    type="button"
                    onClick={() => goToQuestion(idx)}
                    className={`h-8 border flex items-center justify-center transition-all cursor-pointer rounded-[2px] ${badgeStyles} ${
                      isCurrent
                        ? 'ring-2 ring-[#D96836] ring-offset-1 font-bold z-10'
                        : 'hover:border-[#191919]'
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

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191919]/60 backdrop-blur-xs">
          <div className="swiss-card max-w-md w-full p-6 sm:p-7 relative font-sans shadow-xl bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D2C5] mb-4">
              <h3 className="font-display font-bold text-lg text-[#191919]">
                Submit Examination?
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-[#66645F] hover:text-[#191919] text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#66645F] leading-relaxed">
              Once submitted, all answers are locked and graded server-side against the official answer keys. You cannot modify answers after final submission.
            </p>

            {/* Test Summary breakdown */}
            <div className="grid grid-cols-2 gap-2 my-5 p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] font-mono text-xs">
              <div>
                <span className="text-[#66645F] block text-[10px] uppercase">Total Questions</span>
                <span className="font-bold text-[#191919] text-base">{questions.length}</span>
              </div>
              <div>
                <span className="text-[#66645F] block text-[10px] uppercase">Answered</span>
                <span className="font-bold text-[#65715B] text-base">
                  {summaryCounts.totalAnswered}
                </span>
              </div>
              <div className="pt-2 border-t border-[#D9D2C5]">
                <span className="text-[#66645F] block text-[10px] uppercase">Unanswered</span>
                <span className="font-bold text-[#C04A26] text-base">
                  {summaryCounts.totalUnanswered}
                </span>
              </div>
              <div className="pt-2 border-t border-[#D9D2C5]">
                <span className="text-[#66645F] block text-[10px] uppercase">Marked for Review</span>
                <span className="font-bold text-[#D96836] text-base">
                  {summaryCounts.marked + summaryCounts['answered-marked']}
                </span>
              </div>
            </div>

            <div className="flex space-x-3 text-xs">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 btn-secondary-neutral"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={handleSubmitTest}
                disabled={submitting}
                className="flex-1 py-2.5 btn-primary-orange"
              >
                <span>{submitting ? 'Submitting...' : 'Confirm Submission'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

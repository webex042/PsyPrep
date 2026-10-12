import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  ChevronLeft,
  Check,
  X,
  Info,
} from 'lucide-react';

export function ResultReview() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [resultData, setResultData] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'unattempted'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    async function loadResult() {
      try {
        setLoading(true);
        setError('');
        const data = await api.get(`/api/attempts/${attemptId}/result`);
        setResultData(data);
      } catch (err) {
        setError(err.message || 'Failed to load test result');
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [attemptId]);

  const handleRetake = async () => {
    if (!resultData?.quiz?._id) return;
    try {
      setRetaking(true);
      const data = await api.post(`/api/quizzes/${resultData.quiz._id}/attempts`, {});
      navigate(`/test/${data.attempt._id}`);
    } catch (err) {
      if (err.status === 409 && err.raw?.error?.attemptId) {
        navigate(`/test/${err.raw.error.attemptId}`);
      } else {
        setError(err.message || 'Unable to initiate retake attempt');
      }
    } finally {
      setRetaking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            Compiling Official NPTEL Evaluation Transcript & Solutions...
          </div>
        </div>
      </div>
    );
  }

  if (error || !resultData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="swiss-card p-6 shadow-sm">
          <p className="text-[#D96836] font-mono text-xs mb-4">{error || 'Result transcript unavailable'}</p>
          <Link
            to="/dashboard"
            className="btn-secondary-neutral inline-block px-4 py-2 text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { attempt, quiz, questionsReview } = resultData;

  // Filtered review list
  const filteredQuestions = questionsReview.filter((q) => {
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return !q.isCorrect && !q.isUnattempted;
    if (filter === 'unattempted') return q.isUnattempted;
    return true;
  });

  const totalTimeSeconds = Math.round((attempt.totalTimeSpentMs || 0) / 1000);
  const avgTimePerQuestion =
    questionsReview.length > 0 ? Math.round(totalTimeSeconds / questionsReview.length) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex items-center justify-between font-mono text-xs">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-[#66645F] hover:text-[#191919] font-medium"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span>Back to Dashboard</span>
        </Link>

        {quiz?.allowRetakes && (
          <button
            onClick={handleRetake}
            disabled={retaking}
            className="py-1.5 px-4 btn-primary-orange flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{retaking ? 'Initializing...' : 'Retake Examination'}</span>
          </button>
        )}
      </div>

      {/* Official Score Transcript Card — Swiss Grid */}
      <div className="swiss-card bg-[#FFFFFF] shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#D9D2C5]">
          <div>
            <div className="inline-block px-2.5 py-0.5 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] text-[10px] font-mono text-[#D96836] font-bold uppercase mb-2">
              NPTEL 2026 Examination Transcript • Attempt #{attempt.attemptNumber}
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#191919]">
              {quiz.title}
            </h1>
            <p className="text-[#66645F] font-mono text-xs mt-1">
              Finalized at {new Date(attempt.submittedAt).toLocaleString()}
            </p>
          </div>

          {/* Large Score & Accuracy Gauge */}
          <div className="flex items-center space-x-4 shrink-0 bg-[#FAF7F0] p-4 border border-[#D9D2C5] rounded-[2px]">
            <div className="text-right font-mono">
              <span className="text-2xl sm:text-3xl font-display font-bold text-[#191919] block leading-none">
                {attempt.score} <span className="text-sm text-[#66645F] font-normal">/ {attempt.maxScore}</span>
              </span>
              <span className="text-[10px] text-[#66645F] uppercase mt-1 block">Marks Awarded</span>
            </div>
            <div
              className={`w-16 h-16 border rounded-[2px] flex items-center justify-center font-display font-bold text-xl ${
                attempt.percentage >= 70
                  ? 'bg-[#EFF2ED] text-[#65715B] border-[#65715B]'
                  : attempt.percentage >= 40
                  ? 'bg-[#FDF2EC] text-[#D96836] border-[#D96836]'
                  : 'bg-[#FDF2EC] text-[#C04A26] border-[#C04A26]'
              }`}
            >
              {attempt.percentage}%
            </div>
          </div>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-2 font-mono text-xs">
          <div className="p-3.5 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#66645F] uppercase block font-bold">
              Correct Answers
            </span>
            <span className="text-xl font-display font-bold text-[#65715B] mt-1 block">
              {attempt.correctCount}
            </span>
          </div>

          <div className="p-3.5 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#66645F] uppercase block font-bold">
              Incorrect Answers
            </span>
            <span className="text-xl font-display font-bold text-[#D96836] mt-1 block">
              {attempt.incorrectCount}
            </span>
          </div>

          <div className="p-3.5 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#66645F] uppercase block font-bold">
              Unattempted
            </span>
            <span className="text-xl font-display font-bold text-[#191919] mt-1 block">
              {attempt.unattemptedCount}
            </span>
          </div>

          <div className="p-3.5 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#66645F] uppercase block font-bold">
              Avg Time / Question
            </span>
            <span className="text-xl font-display font-bold text-[#191919] mt-1 block">
              {avgTimePerQuestion}s
            </span>
          </div>
        </div>
      </div>

      {/* Solutions & Detailed Question Review */}
      <div className="space-y-4">
        {/* Review Filter Navigation — Swiss Grid Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="font-bold text-[#191919] font-display text-sm">
            Detailed Solution Review ({filteredQuestions.length} Questions)
          </div>

          <div className="flex items-center space-x-1 bg-[#FFFFFF] p-1 border border-[#D9D2C5] rounded-[2px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                filter === 'all'
                  ? 'bg-[#191919] text-white'
                  : 'text-[#66645F] hover:text-[#191919]'
              }`}
            >
              All ({questionsReview.length})
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                filter === 'correct'
                  ? 'bg-[#65715B] text-white'
                  : 'text-[#66645F] hover:text-[#191919]'
              }`}
            >
              Correct ({attempt.correctCount})
            </button>
            <button
              onClick={() => setFilter('incorrect')}
              className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                filter === 'incorrect'
                  ? 'bg-[#D96836] text-white'
                  : 'text-[#66645F] hover:text-[#191919]'
              }`}
            >
              Incorrect ({attempt.incorrectCount})
            </button>
            <button
              onClick={() => setFilter('unattempted')}
              className={`px-3 py-1 font-bold rounded-[2px] transition-all ${
                filter === 'unattempted'
                  ? 'bg-[#66645F] text-white'
                  : 'text-[#66645F] hover:text-[#191919]'
              }`}
            >
              Skipped ({attempt.unattemptedCount})
            </button>
          </div>
        </div>

        {/* Questions Solution Cards */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            return (
              <div
                key={q._id}
                className="swiss-card p-6 bg-[#FFFFFF] shadow-sm"
              >
                {/* Question Status Badge Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#D9D2C5] mb-4 font-mono text-xs gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#191919] bg-[#FAF7F0] px-2 py-0.5 border border-[#D9D2C5] rounded-[2px]">
                      Q. #{idx + 1}
                    </span>
                    <span className="text-[#66645F]">
                      [{q.topic || q.subject || 'General'}]
                    </span>
                  </div>

                  <div>
                    {q.isCorrect && (
                      <span className="px-2.5 py-0.5 bg-[#EFF2ED] text-[#65715B] border border-[#65715B] font-bold rounded-[2px]">
                        Correct (+{q.marksAwarded} Mark)
                      </span>
                    )}
                    {!q.isCorrect && !q.isUnattempted && (
                      <span className="px-2.5 py-0.5 bg-[#FDF2EC] text-[#D96836] border border-[#D96836] font-bold rounded-[2px]">
                        Incorrect (0 Marks)
                      </span>
                    )}
                    {q.isUnattempted && (
                      <span className="px-2.5 py-0.5 bg-[#FAF7F0] text-[#66645F] border border-[#D9D2C5] font-bold rounded-[2px]">
                        Unattempted (0 Marks)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="font-display text-base font-semibold text-[#191919] mb-4 leading-relaxed">
                  {q.stem}
                </h3>

                {/* Options List with Answer Key Highlight */}
                <div className="space-y-2 mb-4 font-sans text-xs sm:text-sm">
                  {q.options.map((opt) => {
                    const isCorrectOption = opt.id === q.correctAnswer;
                    const isStudentChosen = opt.id === q.studentResponse;

                    let optionBorder = 'border border-[#D9D2C5] bg-[#FFFFFF] text-[#191919]';
                    if (isCorrectOption) {
                      optionBorder = 'border-2 border-[#65715B] bg-[#EFF2ED] text-[#191919] font-medium';
                    } else if (isStudentChosen && !isCorrectOption) {
                      optionBorder = 'border-2 border-[#D96836] bg-[#FDF2EC] text-[#191919] font-medium';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-[2px] flex items-center justify-between ${optionBorder}`}
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                              isCorrectOption
                                ? 'bg-[#65715B] text-white'
                                : isStudentChosen
                                ? 'bg-[#D96836] text-white'
                                : 'bg-[#FAF7F0] text-[#66645F] border border-[#D9D2C5]'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>

                        <div className="text-[11px] font-mono font-bold shrink-0">
                          {isCorrectOption && (
                            <span className="text-[#65715B] flex items-center">
                              <Check className="w-3.5 h-3.5 mr-1" /> Correct Key
                            </span>
                          )}
                          {isStudentChosen && !isCorrectOption && (
                            <span className="text-[#D96836] flex items-center">
                              <X className="w-3.5 h-3.5 mr-1" /> Candidate Response
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Card */}
                <div className="p-3.5 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] text-xs">
                  <div className="font-mono font-bold text-[#191919] mb-1 flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-[#D96836]" />
                    <span>Pedagogical Notes & Explanation:</span>
                  </div>
                  {q.explanation && q.explanation.trim().length > 0 ? (
                    <p className="text-[#66645F] leading-relaxed font-sans pl-5">
                      {q.explanation}
                    </p>
                  ) : (
                    <p className="text-[#66645F] italic font-sans pl-5">
                      No additional pedagogical notes provided for this item.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

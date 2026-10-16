import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import {
  getMockAttempt,
  createMockTestAttempt,
} from '../services/mockTestService';

export function MockTestResult() {
  const { setNumber, attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'unanswered'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getMockAttempt(attemptId);
    if (data) {
      setAttempt(data);
    }
    setLoading(false);
  }, [attemptId]);

  const handleRetake = async () => {
    try {
      const newAttempt = await createMockTestAttempt(setNumber);
      navigate(`/mock-test/${setNumber}/attempt/${newAttempt.attemptId}`);
    } catch (err) {
      console.error('Failed to create retake attempt:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            Compiling Examination Dossier...
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="swiss-card p-8 bg-white shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#D96836] mx-auto mb-3" />
          <h2 className="font-display font-bold text-lg text-[#191919]">
            Attempt Record Not Found
          </h2>
          <p className="text-xs text-[#66645F] mt-1 font-mono">
            Could not find result dossier for attempt ID: {attemptId}
          </p>
          <div className="mt-6">
            <Link to="/" className="py-2 px-4 btn-primary-orange text-xs inline-flex items-center space-x-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Mock Tests Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const reviewList = attempt.questionsReview || [];

  const filteredQuestions = reviewList.filter((q) => {
    if (filterTab === 'correct') return q.isCorrect;
    if (filterTab === 'incorrect') return q.isAnswered && !q.isCorrect;
    if (filterTab === 'unanswered') return !q.isAnswered;
    return true;
  });

  const durationFormatted = attempt.submittedAt && attempt.startedAt
    ? Math.round((attempt.submittedAt - attempt.startedAt) / 60000)
    : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Results Header */}
      <div className="swiss-card p-6 sm:p-8 bg-[#FFFFFF] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#D9D2C5]">
          <div>
            <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-[#65715B] font-bold uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Official Examination Evaluation • NPTEL 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#191919] tracking-tight">
              {attempt.setTitle} — Result Dossier
            </h1>
            <p className="text-[#66645F] text-xs sm:text-sm mt-1 font-mono">
              Completed on {new Date(attempt.submittedAt || Date.now()).toLocaleString()} • Time taken: ~{durationFormatted} mins
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRetake}
              className="py-2 px-4 btn-primary-orange text-xs flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Test (New 50 Questions)</span>
            </button>
            <Link
              to="/"
              className="py-2 px-4 btn-secondary-neutral text-xs flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mock Tests Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Scorecard Headline Tiles: Swiss Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 font-mono text-xs">
          {/* Final Score */}
          <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
              Total Score
            </span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="font-display font-bold text-3xl sm:text-4xl text-[#191919]">
                {attempt.score}
              </span>
              <span className="text-xs text-[#66645F]">/ {attempt.maxScore || 50}</span>
            </div>
            <span className="text-[10px] text-[#65715B] font-semibold mt-1 block">
              1 Mark Per Question
            </span>
          </div>

          {/* Percentage */}
          <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
              Percentage
            </span>
            <span className="font-display font-bold text-3xl sm:text-4xl text-[#D96836] mt-1 block">
              {attempt.percentage}%
            </span>
            <span className="text-[10px] text-[#66645F] mt-1 block">
              {attempt.percentage >= 40 ? 'Qualifying Mark Achieved' : 'Need 40% to Qualify'}
            </span>
          </div>

          {/* Correct Count */}
          <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#65715B] uppercase tracking-wider block font-bold">
              Correct Answers
            </span>
            <span className="font-display font-bold text-3xl sm:text-4xl text-[#65715B] mt-1 block">
              {attempt.correctCount}
            </span>
            <span className="text-[10px] text-[#65715B] mt-1 block">
              +{attempt.correctCount} Marks Earned
            </span>
          </div>

          {/* Incorrect & Skipped */}
          <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
            <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
              Incorrect / Skipped
            </span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#191919]">
                {attempt.incorrectCount}
              </span>
              <span className="text-xs text-[#66645F]">wrong, {attempt.unansweredCount} skipped</span>
            </div>
            <span className="text-[10px] text-[#66645F] mt-1 block">
              Zero Negative Marking
            </span>
          </div>
        </div>
      </div>

      {/* Question-Wise Review Section */}
      <div className="space-y-4">
        {/* Header and Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-[#D9D2C5] rounded-[2px]">
          <h2 className="font-display font-bold text-base text-[#191919] flex items-center space-x-2">
            <span>Question-by-Question Solution Dossier</span>
            <span className="text-xs font-mono font-normal text-[#66645F]">
              ({filteredQuestions.length} questions)
            </span>
          </h2>

          <div className="flex items-center space-x-1 font-mono text-xs overflow-x-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-[2px] transition-all whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-[#191919] text-white font-bold'
                  : 'text-[#66645F] hover:bg-[#FAF7F0]'
              }`}
            >
              All (50)
            </button>
            <button
              onClick={() => setFilterTab('correct')}
              className={`px-3 py-1 rounded-[2px] transition-all whitespace-nowrap text-[#65715B] ${
                filterTab === 'correct'
                  ? 'bg-[#65715B] text-white font-bold'
                  : 'hover:bg-[#FAF7F0]'
              }`}
            >
              Correct ({attempt.correctCount})
            </button>
            <button
              onClick={() => setFilterTab('incorrect')}
              className={`px-3 py-1 rounded-[2px] transition-all whitespace-nowrap text-[#D96836] ${
                filterTab === 'incorrect'
                  ? 'bg-[#D96836] text-white font-bold'
                  : 'hover:bg-[#FAF7F0]'
              }`}
            >
              Incorrect ({attempt.incorrectCount})
            </button>
            <button
              onClick={() => setFilterTab('unanswered')}
              className={`px-3 py-1 rounded-[2px] transition-all whitespace-nowrap text-[#66645F] ${
                filterTab === 'unanswered'
                  ? 'bg-[#66645F] text-white font-bold'
                  : 'hover:bg-[#FAF7F0]'
              }`}
            >
              Unanswered ({attempt.unansweredCount})
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            return (
              <div
                key={q.id}
                className="swiss-card p-5 sm:p-6 bg-white shadow-sm border border-[#D9D2C5]"
              >
                {/* Question Metadata Strip */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#D9D2C5] gap-2 font-mono text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-[#191919] text-white font-bold rounded-[2px]">
                      Q. {q.index}
                    </span>
                    <span className="text-[#66645F]">
                      ID: {q.id}
                    </span>
                    <span className="swiss-tag bg-[#FAF7F0] text-[#191919]">
                      {q.topic}
                    </span>
                  </div>

                  {/* Outcome Badge */}
                  <div>
                    {q.isCorrect ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-[#EFF5ED] text-[#65715B] border border-[#C5DAC1] font-bold rounded-[2px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct (+1.00 Mark)</span>
                      </span>
                    ) : q.isAnswered ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-[#FDF2EC] text-[#D96836] border border-[#F4C8B5] font-bold rounded-[2px]">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect (0.00 Mark)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-[#FAF7F0] text-[#66645F] border border-[#D9D2C5] rounded-[2px]">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Unanswered (0.00 Mark)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Stem */}
                <div className="py-4">
                  <h3 className="font-display font-medium text-base text-[#191919] leading-relaxed">
                    {q.stem}
                  </h3>
                </div>

                {/* Options Review */}
                <div className="space-y-2 font-sans text-xs">
                  {q.options.map((opt) => {
                    const isCandidateChoice = q.userAnswer === opt.id;
                    const isOfficialAnswer = q.correctAnswer === opt.id;

                    let rowStyle = 'border-[#D9D2C5] bg-white text-[#191919]';
                    let badge = null;

                    if (isOfficialAnswer) {
                      rowStyle = 'border-[#65715B] bg-[#F0F5EE] text-[#191919] font-medium';
                      badge = (
                        <span className="ml-auto font-mono text-[10px] bg-[#65715B] text-white px-2 py-0.5 rounded-[2px] font-bold">
                          ✓ Correct Answer
                        </span>
                      );
                    }

                    if (isCandidateChoice && !isOfficialAnswer) {
                      rowStyle = 'border-[#D96836] bg-[#FDF2EC] text-[#D96836]';
                      badge = (
                        <span className="ml-auto font-mono text-[10px] bg-[#D96836] text-white px-2 py-0.5 rounded-[2px] font-bold">
                          ✗ Your Selected Answer
                        </span>
                      );
                    } else if (isCandidateChoice && isOfficialAnswer) {
                      badge = (
                        <span className="ml-auto font-mono text-[10px] bg-[#65715B] text-white px-2 py-0.5 rounded-[2px] font-bold">
                          ✓ Your Answer (Correct)
                        </span>
                      );
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 border rounded-[2px] flex items-center space-x-3 transition-colors ${rowStyle}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isOfficialAnswer
                              ? 'bg-[#65715B] text-white'
                              : isCandidateChoice
                              ? 'bg-[#D96836] text-white'
                              : 'bg-[#FAF7F0] text-[#66645F] border border-[#D9D2C5]'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span className="leading-relaxed">{opt.text}</span>
                        {badge}
                      </div>
                    );
                  })}
                </div>

                {/* Pedagogical Explanation if available */}
                {q.explanation && (
                  <div className="mt-4 p-3.5 bg-[#FAF7F0] border-l-2 border-[#D96836] text-xs font-sans text-[#191919] space-y-1">
                    <span className="font-mono font-bold text-[#D96836] block text-[10px] uppercase tracking-wider">
                      Pedagogical Explanation:
                    </span>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

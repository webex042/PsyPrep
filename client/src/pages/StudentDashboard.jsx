import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Award,
  Play,
  RotateCcw,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Layers,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingQuizId, setStartingQuizId] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [quizzesData, analyticsData] = await Promise.all([
          api.get('/api/quizzes'),
          api.get('/api/students/me/analytics').catch(() => null),
        ]);
        setQuizzes(quizzesData.quizzes || []);
        setAnalytics(analyticsData);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const handleStartQuiz = async (quizId) => {
    try {
      setStartingQuizId(quizId);
      setError('');
      const data = await api.post(`/api/quizzes/${quizId}/attempts`, {});
      navigate(`/test/${data.attempt._id}`);
    } catch (err) {
      if (err.status === 409 && err.raw?.error?.attemptId) {
        // Resume existing live attempt
        navigate(`/test/${err.raw.error.attemptId}`);
      } else {
        setError(err.message || 'Unable to start attempt');
      }
    } finally {
      setStartingQuizId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            Loading Psychology of Learning Examination Dossier...
          </div>
          <div className="mt-1 text-xs text-[#66645F] font-mono">
            Synchronizing question banks and candidate history
          </div>
        </div>
      </div>
    );
  }

  // Calculate high-level best and latest headlines
  const bestPerformance = analytics?.quizPerformances?.reduce(
    (max, q) => (q.bestPercentage > (max?.bestPercentage || 0) ? q : max),
    null
  );
  const latestPerformance = analytics?.quizPerformances?.[analytics.quizPerformances.length - 1];

  return (
    <div className="space-y-8">
      {/* Editorial Academic Masthead & Candidate Banner */}
      <div className="swiss-card p-6 sm:p-8 bg-[#FFFFFF] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#D9D2C5]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-[#D96836] font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#D96836]" />
              <span>NPTEL 2026 Examination Environment • Course NOC26-GE04</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-[#191919] tracking-tight leading-tight">
              Psychology of Learning Mock Examination
            </h1>
            <p className="text-[#66645F] text-xs sm:text-sm mt-2 leading-relaxed">
              Standardized Computer-Based Test (CBT) practice portal for candidates preparing for the NPTEL certification.
              Features a server-synchronized exam timer, 5-state question palette, instant scoring, and complete pedagogical explanations.
            </p>
          </div>

          {/* Quick Metrics Headline Cards: Swiss Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 font-mono text-xs">
            <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] min-w-[130px]">
              <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
                Overall Accuracy
              </span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#191919] mt-1 block">
                {analytics?.overallAccuracy || 0}%
              </span>
              <span className="text-[10px] text-[#65715B] font-semibold mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                All attempts
              </span>
            </div>

            <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] min-w-[130px]">
              <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
                Personal Best
              </span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#65715B] mt-1 block">
                {bestPerformance ? `${bestPerformance.bestPercentage}%` : '—'}
              </span>
              <span className="text-[10px] text-[#66645F] truncate mt-1 block">
                {bestPerformance ? bestPerformance.title : 'No record'}
              </span>
            </div>

            <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] min-w-[130px]">
              <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
                Latest Attempt
              </span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#D96836] mt-1 block">
                {latestPerformance ? `${latestPerformance.latestPercentage}%` : '—'}
              </span>
              <span className="text-[10px] text-[#66645F] truncate mt-1 block">
                {latestPerformance ? latestPerformance.title : 'Awaiting test'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Instructions Strip */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#66645F]">
          <div className="flex items-center space-x-4">
            <span>Candidate: <strong className="text-[#191919] font-sans">{user?.name}</strong></span>
            <span>•</span>
            <span>System: <strong className="text-[#65715B]">CBT Auto-Submit Active</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="swiss-tag bg-white">No Negative Marking</span>
            <span className="swiss-tag bg-white">Unlimited Retakes</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FDF2EC] border border-[#D96836] text-[#D96836] font-mono text-xs flex items-center space-x-2 rounded-[2px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Available Examinations Section — Swiss Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 font-display">
            <BookOpen className="w-4 h-4 text-[#D96836]" />
            <h2 className="text-lg font-bold text-[#191919]">
              Available Examination Papers ({quizzes.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-[#66645F]">
            Psychology & Educational Science Modules
          </span>
        </div>

        {quizzes.length === 0 ? (
          <div className="swiss-card p-8 text-center text-[#66645F] font-mono text-xs">
            No published examination papers currently available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map((quiz) => {
              const quizPerf = analytics?.quizPerformances?.find(
                (p) => p.quizId === quiz._id
              );
              const isStarting = startingQuizId === quiz._id;

              return (
                <div
                  key={quiz._id}
                  className="swiss-card p-6 bg-[#FFFFFF] flex flex-col justify-between hover:border-[#191919] transition-all group shadow-sm"
                >
                  <div>
                    {/* Header badge row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="swiss-tag bg-[#FAF7F0] text-[#191919]">
                        {quiz.subject || 'PSYCHOLOGY'}
                      </span>
                      {quizPerf && (
                        <span className="px-2 py-0.5 rounded-[2px] bg-[#EFF2ED] text-[#65715B] border border-[#D9D2C5] font-mono text-[10px] font-bold">
                          Best: {quizPerf.bestPercentage}%
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-lg text-[#191919] group-hover:text-[#D96836] transition-colors leading-snug line-clamp-2">
                      {quiz.title}
                    </h3>
                    <p className="text-[#66645F] text-xs mt-2 font-sans line-clamp-2 leading-relaxed">
                      {quiz.description || 'Comprehensive timed mock examination for NPTEL Psychology of Learning.'}
                    </p>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-[#D9D2C5] font-mono text-[11px] text-[#66645F]">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#191919]" />
                        <span>{quiz.durationMinutes} Minutes</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Award className="w-3.5 h-3.5 text-[#191919]" />
                        <span>{quiz.totalMarks || quiz.questions?.length || 0} Total Marks</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3">
                    <button
                      onClick={() => handleStartQuiz(quiz._id)}
                      disabled={isStarting}
                      className="w-full py-2.5 px-4 btn-primary-orange text-xs flex items-center justify-center space-x-2"
                    >
                      {isStarting ? (
                        <span>Initializing Examination...</span>
                      ) : quizPerf ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake Examination (Attempt #{quizPerf.attemptsCount + 1})</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Mock Test</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Candidate Attempt History Ledger Table */}
      {analytics?.scoreTrend && analytics.scoreTrend.length > 0 && (
        <div className="swiss-card bg-[#FFFFFF] shadow-sm">
          <div className="p-4 sm:p-5 border-b border-[#D9D2C5] flex items-center justify-between">
            <div className="flex items-center space-x-2 font-display">
              <Layers className="w-4 h-4 text-[#D96836]" />
              <h2 className="text-base font-bold text-[#191919]">
                Candidate Attempt Ledger
              </h2>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-mono text-[#D96836] hover:underline font-bold flex items-center space-x-1"
            >
              <span>View Full Analytics</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-[#FAF7F0] text-[#66645F] font-mono uppercase text-[10px] tracking-wider border-b border-[#D9D2C5]">
                <tr>
                  <th className="py-2.5 px-4">Examination Paper</th>
                  <th className="py-2.5 px-4">Attempt #</th>
                  <th className="py-2.5 px-4">Score</th>
                  <th className="py-2.5 px-4">Accuracy</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D2C5]">
                {analytics.scoreTrend.slice(-6).reverse().map((run, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF7F0] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#191919]">
                      {run.quizTitle}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#66645F]">
                      #{run.attemptNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#191919]">
                      {run.score} / {run.maxScore}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span
                        className={`font-bold ${
                          run.percentage >= 70
                            ? 'text-[#65715B]'
                            : run.percentage >= 40
                            ? 'text-[#D96836]'
                            : 'text-[#C04A26]'
                        }`}
                      >
                        {run.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#66645F]">
                      {new Date(run.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/test/${run._id || run.attemptId || ''}/result`}
                        className="inline-block px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#F5F0E6] border border-[#D9D2C5] rounded-[2px] font-mono text-[11px] font-bold text-[#D96836] transition-colors"
                      >
                        Review Result
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

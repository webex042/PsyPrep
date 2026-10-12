import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ChevronLeft,
  BarChart2,
  TrendingDown,
} from 'lucide-react';

export function TeacherAnalytics() {
  const { quizId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadQuizAnalytics() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/api/quizzes/${quizId}/analytics`);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to fetch aggregate analytics');
      } finally {
        setLoading(false);
      }
    }

    loadQuizAnalytics();
  }, [quizId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            Compiling Cohort Score Histogram & Item Analysis...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="swiss-card p-6 shadow-sm">
          <p className="text-[#D96836] font-mono text-xs mb-4">{error || 'Data dossier unavailable'}</p>
          <Link
            to="/teacher"
            className="btn-secondary-neutral inline-block px-4 py-2 text-xs"
          >
            Return to Faculty Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="font-mono text-xs">
        <Link
          to="/teacher"
          className="inline-flex items-center text-[#66645F] hover:text-[#191919] font-medium mb-1"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span>Back to Faculty Hub</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#191919] tracking-tight">
          {data.title} — Cohort Analytics
        </h1>
        <p className="text-[#66645F] text-xs mt-0.5">
          Aggregate evaluation across {data.totalAttempts} total attempts from {data.uniqueStudents} unique student test-takers.
        </p>
      </div>

      {/* Aggregate KPI Cards — Swiss Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3.5 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase font-bold block">
            Total Attempts
          </span>
          <span className="text-2xl font-display font-bold text-[#191919] mt-0.5 block">
            {data.totalAttempts}
          </span>
        </div>

        <div className="p-3.5 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase font-bold block">
            Candidates
          </span>
          <span className="text-2xl font-display font-bold text-[#D96836] mt-0.5 block">
            {data.uniqueStudents}
          </span>
        </div>

        <div className="p-3.5 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase font-bold block">
            Average Score
          </span>
          <span className="text-2xl font-display font-bold text-[#191919] mt-0.5 block">
            {data.averageScore}
          </span>
        </div>

        <div className="p-3.5 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase font-bold block">
            Median Score
          </span>
          <span className="text-2xl font-display font-bold text-[#191919] mt-0.5 block">
            {data.medianScore}
          </span>
        </div>

        <div className="p-3.5 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase font-bold block">
            Peak Score
          </span>
          <span className="text-2xl font-display font-bold text-[#65715B] mt-0.5 block">
            {data.highestScore}
          </span>
        </div>

        <div className="p-3.5 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase font-bold block">
            Lowest Score
          </span>
          <span className="text-2xl font-display font-bold text-[#C04A26] mt-0.5 block">
            {data.lowestScore}
          </span>
        </div>
      </div>

      {/* Score Distribution Histogram */}
      <div className="swiss-card bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#D9D2C5]">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-[#191919] flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-[#65715B]" />
              <span>Score Distribution Histogram</span>
            </h2>
            <p className="text-[#66645F] text-xs mt-0.5 font-sans">
              Distribution of student scores grouped across performance brackets.
            </p>
          </div>
          <span className="font-mono text-xs text-[#66645F]">Cohort Frequency</span>
        </div>

        <div className="h-64 sm:h-72 w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.histogram} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#D9D2C5" />
              <XAxis dataKey="range" stroke="#66645F" fontSize={11} tickLine={true} />
              <YAxis
                stroke="#66645F"
                fontSize={11}
                allowDecimals={false}
                tickLine={true}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D9D2C5',
                  borderRadius: '2px',
                  color: '#191919',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="count" fill="#65715B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Missed Questions */}
      {data.mostMissedQuestions && data.mostMissedQuestions.length > 0 && (
        <div className="swiss-card bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#D9D2C5]">
            <h2 className="font-display font-bold text-base sm:text-lg text-[#191919] flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-[#D96836]" />
              <span>Most-Missed Questions (Concepts to Review)</span>
            </h2>
            <span className="font-mono text-xs text-[#66645F]">Curriculum Gaps</span>
          </div>

          <div className="space-y-3 font-sans text-xs">
            {data.mostMissedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <span className="text-[11px] font-mono font-bold text-[#D96836] block mb-1">
                    Miss Rate: {q.missRate}% ({q.incorrectAttempts} of {q.totalAttempts} incorrect)
                  </span>
                  <p className="font-display text-sm font-semibold text-[#191919] leading-relaxed">
                    {q.stem}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right font-mono">
                  <span className="text-[10px] text-[#66645F] block uppercase">Correct Key</span>
                  <span className="font-bold text-[#65715B] text-sm">
                    Option {q.correctAnswer}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

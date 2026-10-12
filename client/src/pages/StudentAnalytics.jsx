import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  BookOpen,
  ChevronLeft,
  AlertCircle,
  BarChart2,
} from 'lucide-react';

export function StudentAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/api/students/me/analytics');
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to fetch student analytics');
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            Compiling Longitudinal CBT Performance Analytics...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || data.totalAttempts === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="swiss-card p-8 bg-white shadow-sm">
          <BookOpen className="w-10 h-10 text-[#66645F] mx-auto mb-3" />
          <h2 className="text-xl font-display font-bold text-[#191919]">
            No Examination Records Found Yet
          </h2>
          <p className="text-[#66645F] text-xs max-w-md mx-auto mt-1 mb-6 leading-relaxed">
            Take a mock test in the Psychology of Learning curriculum to generate longitudinal score trends, topic mastery data, and retention insights.
          </p>
          <Link
            to="/dashboard"
            className="btn-primary-orange inline-block px-5 py-2.5 text-xs font-semibold"
          >
            Start Your First Mock Test →
          </Link>
        </div>
      </div>
    );
  }

  // Format score trend for Recharts
  const trendChartData = data.scoreTrend.map((run, idx) => ({
    attempt: `Att. #${idx + 1}`,
    score: run.score,
    percentage: run.percentage,
    title: run.quizTitle,
  }));

  // Format topic breakdown for Recharts
  const topicChartData = data.topicBreakdown.map((t) => ({
    topic: t.topic.length > 15 ? t.topic.substring(0, 13) + '..' : t.topic,
    accuracy: t.accuracy,
    total: t.total,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between font-mono text-xs">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center text-[#66645F] hover:text-[#191919] font-medium mb-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>Back to Mock Tests</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#191919] tracking-tight">
            Performance & Retake Analytics
          </h1>
          <p className="text-[#66645F] text-xs mt-0.5">
            Psychology of Learning (NPTEL 2026) candidate trajectory and topic proficiency.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards — Swiss Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="p-4 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
            Overall Accuracy
          </span>
          <span className="text-2xl sm:text-3xl font-display font-bold text-[#191919] mt-1 block">
            {data.overallAccuracy}%
          </span>
          <span className="text-[10px] text-[#66645F] mt-1 block">
            Across {data.totalAttempts} completed attempt{data.totalAttempts === 1 ? '' : 's'}
          </span>
        </div>

        <div className="p-4 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
            Papers Explored
          </span>
          <span className="text-2xl sm:text-3xl font-display font-bold text-[#D96836] mt-1 block">
            {data.quizzesTaken}
          </span>
          <span className="text-[10px] text-[#66645F] mt-1 block">
            Distinct exam syllabi attempted
          </span>
        </div>

        <div className="p-4 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
            Record Peak Score
          </span>
          <span className="text-2xl sm:text-3xl font-display font-bold text-[#65715B] mt-1 block">
            {Math.max(...data.quizPerformances.map((q) => q.bestPercentage))}%
          </span>
          <span className="text-[10px] text-[#65715B] mt-1 block font-bold">
            Peak performance achieved
          </span>
        </div>

        <div className="p-4 bg-white border border-[#D9D2C5] rounded-[2px] shadow-sm">
          <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
            Retake Iterations
          </span>
          <span className="text-2xl sm:text-3xl font-display font-bold text-[#191919] mt-1 block">
            {Math.max(0, data.totalAttempts - data.quizzesTaken)}
          </span>
          <span className="text-[10px] text-[#66645F] mt-1 block">
            Practice repetition cycles
          </span>
        </div>
      </div>

      {/* Retake Trend Chart: Score Improvement Across Attempts */}
      <div className="swiss-card bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#D9D2C5]">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-[#191919] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#D96836]" />
              <span>Score Trajectory Across Retakes</span>
            </h2>
            <p className="text-[#66645F] text-xs mt-0.5 font-sans">
              Measures knowledge retention and test-taking improvement curves.
            </p>
          </div>
          <span className="font-mono text-xs text-[#66645F]">Y-Axis: Accuracy (%)</span>
        </div>

        <div className="h-64 sm:h-72 w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#D9D2C5" />
              <XAxis dataKey="attempt" stroke="#66645F" fontSize={11} tickLine={true} />
              <YAxis
                stroke="#66645F"
                fontSize={11}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
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
              <Line
                type="linear"
                dataKey="percentage"
                stroke="#D96836"
                strokeWidth={2}
                dot={{ r: 4, fill: '#FFFFFF', strokeWidth: 2, stroke: '#65715B' }}
                activeDot={{ r: 6, fill: '#D96836' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Topic Accuracy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 swiss-card bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#D9D2C5]">
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-[#191919] flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-[#65715B]" />
                <span>Accuracy Breakdown by Psychology Module</span>
              </h2>
              <p className="text-[#66645F] text-xs mt-0.5 font-sans">
                Topic-by-topic percentage performance across the 13 curriculum areas.
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicChartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#D9D2C5" />
                <XAxis
                  dataKey="topic"
                  stroke="#66645F"
                  fontSize={10}
                  tickLine={true}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#66645F"
                  fontSize={11}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
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
                <Bar dataKey="accuracy" fill="#65715B" stroke="#65715B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strongest & Weakest Topics Sidebar */}
        <div className="lg:col-span-4 space-y-4 font-mono text-xs">
          {/* Strongest Topics */}
          <div className="swiss-card bg-white p-5 shadow-sm">
            <div className="font-display font-bold text-sm text-[#191919] pb-3 border-b border-[#D9D2C5] mb-3">
              Strongest Topic Areas
            </div>
            <div className="space-y-3">
              {data.strongestTopics.map((t, idx) => (
                <div key={idx} className="p-2.5 border border-[#D9D2C5] bg-[#FAF7F0] rounded-[2px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#191919] truncate">{t.topic}</span>
                    <span className="font-bold text-[#65715B] ml-2">{t.accuracy}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EAE4D8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#65715B]"
                      style={{ width: `${t.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weakest Topics */}
          <div className="swiss-card bg-white p-5 shadow-sm">
            <div className="font-display font-bold text-sm text-[#D96836] pb-3 border-b border-[#D9D2C5] mb-3 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Recommended for Review</span>
            </div>
            <div className="space-y-3">
              {data.weakestTopics.map((t, idx) => (
                <div key={idx} className="p-2.5 border border-[#D9D2C5] bg-[#FAF7F0] rounded-[2px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#191919] truncate">{t.topic}</span>
                    <span className="font-bold text-[#D96836] ml-2">{t.accuracy}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EAE4D8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D96836]"
                      style={{ width: `${t.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

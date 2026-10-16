import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Play,
  Layers,
  ArrowLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { getQuestionBank } from '../services/mockTestService';

export function QuestionBankView() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  useEffect(() => {
    async function load() {
      const bank = await getQuestionBank();
      setQuestions(bank);
      setLoading(false);
    }
    load();
  }, []);

  const topics = ['All', ...new Set(questions.map((q) => q.topic).filter(Boolean))];
  const difficulties = ['All', 'easy', 'medium', 'hard'];

  const filtered = questions.filter((q) => {
    const matchesSearch =
      search === '' ||
      q.stem.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase()) ||
      q.options.some((opt) => opt.text.toLowerCase().includes(search.toLowerCase()));

    const matchesTopic = selectedTopic === 'All' || q.topic === selectedTopic;
    const matchesDiff = selectedDifficulty === 'All' || q.difficulty === selectedDifficulty;

    return matchesSearch && matchesTopic && matchesDiff;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="swiss-card p-6 sm:p-8 bg-white shadow-sm border border-[#D9D2C5]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#D9D2C5]">
          <div>
            <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-[#D96836] font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>NPTEL 2026 Examination Repository</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#191919] tracking-tight">
              Central Question Bank ({questions.length} Items)
            </h1>
            <p className="text-[#66645F] text-xs sm:text-sm mt-1 font-mono">
              Complete question repository used dynamically to generate the 50 Mock Test Sets.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="py-2 px-4 btn-primary-orange text-xs flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Mock Test Suite</span>
            </Link>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#66645F]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions or keywords..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] focus:outline-none focus:border-[#191919] font-mono"
            />
          </div>

          {/* Topic Filter */}
          <div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] focus:outline-none focus:border-[#191919] font-mono text-[#191919]"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  Topic: {t}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] focus:outline-none focus:border-[#191919] font-mono text-[#191919]"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  Difficulty: {d.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-display font-bold text-[#191919]">
            Showing {filtered.length} of {questions.length} Questions
          </h2>
          <span className="font-mono text-xs text-[#66645F]">
            Single-Choice Objective Type
          </span>
        </div>

        {loading ? (
          <div className="swiss-card p-12 text-center font-mono text-xs text-[#66645F]">
            Loading 140 question items...
          </div>
        ) : filtered.length === 0 ? (
          <div className="swiss-card p-12 text-center font-mono text-xs text-[#66645F]">
            No questions match your current query or filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((q) => (
              <div
                key={q.id}
                className="swiss-card p-5 sm:p-6 bg-white shadow-sm border border-[#D9D2C5]"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#D9D2C5] gap-2 font-mono text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-[#191919] text-white font-bold rounded-[2px]">
                      {q.id.toUpperCase()}
                    </span>
                    <span className="swiss-tag bg-[#FAF7F0] text-[#191919]">
                      {q.topic}
                    </span>
                    <span className="swiss-tag bg-[#FAF7F0] text-[#66645F] uppercase">
                      {q.difficulty}
                    </span>
                  </div>
                  <span className="font-semibold text-[#65715B]">
                    Correct Answer: [{q.correctAnswer}]
                  </span>
                </div>

                {/* Question Text */}
                <div className="py-4">
                  <p className="font-display font-medium text-base text-[#191919] leading-relaxed">
                    {q.stem}
                  </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                  {q.options.map((opt) => {
                    const isCorrect = q.correctAnswer === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 border rounded-[2px] flex items-center space-x-2.5 ${
                          isCorrect
                            ? 'border-[#65715B] bg-[#F0F5EE] text-[#191919] font-medium'
                            : 'border-[#D9D2C5] bg-white text-[#191919]'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isCorrect
                              ? 'bg-[#65715B] text-white'
                              : 'bg-[#FAF7F0] text-[#66645F] border border-[#D9D2C5]'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span className="leading-snug">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Award,
  Play,
  RotateCcw,
  CheckCircle2,
  FileQuestion,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  getAllSetsSummary,
  createMockTestAttempt,
  createFullMockTestAttempt,
  getFullMockSummary,
  MOCK_TEST_CONFIG,
  FULL_MOCK_CONFIG,
} from '../services/mockTestService';

export function MockTestDashboard({ defaultTab = 'all' }) {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [fullMockSummary, setFullMockSummary] = useState(getFullMockSummary());
  const [activeMainSection, setActiveMainSection] = useState(defaultTab); // 'all' | 'full-mock' | '50-sets'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'completed' | 'unattempted' | 'active'
  const [startingSetNumber, setStartingSetNumber] = useState(null);
  const [isStartingFull, setIsStartingFull] = useState(false);

  useEffect(() => {
    const summary = getAllSetsSummary();
    setSets(summary);
    setFullMockSummary(getFullMockSummary());
  }, []);

  const handleStartSet = async (set) => {
    try {
      setStartingSetNumber(set.setNumber);

      // If there is an active unexpired attempt, resume it
      if (set.hasActiveAttempt && set.activeAttemptId) {
        navigate(`/mock-test/${set.setNumber}/attempt/${set.activeAttemptId}`);
        return;
      }

      // Generate a fresh randomized 50-question mock test attempt
      const attempt = await createMockTestAttempt(set.setNumber);
      navigate(`/mock-test/${set.setNumber}/attempt/${attempt.attemptId}`);
    } catch (err) {
      console.error('Failed to initiate mock test set:', err);
    } finally {
      setStartingSetNumber(null);
    }
  };

  const handleStartFullMock = async () => {
    try {
      setIsStartingFull(true);
      // If there is an active unexpired attempt, resume it
      if (fullMockSummary.hasActiveAttempt && fullMockSummary.activeAttemptId) {
        navigate(`/mock-test/${FULL_MOCK_CONFIG.SET_IDENTIFIER}/attempt/${fullMockSummary.activeAttemptId}`);
        return;
      }

      // Generate a fresh randomized 140-question mock test attempt
      const attempt = await createFullMockTestAttempt();
      navigate(`/mock-test/${FULL_MOCK_CONFIG.SET_IDENTIFIER}/attempt/${attempt.attemptId}`);
    } catch (err) {
      console.error('Failed to initiate full mock test:', err);
    } finally {
      setIsStartingFull(false);
    }
  };

  const handleRetakeFullMock = async (e) => {
    if (e) e.stopPropagation();
    try {
      setIsStartingFull(true);
      const attempt = await createFullMockTestAttempt();
      navigate(`/mock-test/${FULL_MOCK_CONFIG.SET_IDENTIFIER}/attempt/${attempt.attemptId}`);
    } catch (err) {
      console.error('Failed to retake full mock test:', err);
    } finally {
      setIsStartingFull(false);
    }
  };

  const handleRetakeSet = async (setNumber, e) => {
    e.stopPropagation();
    try {
      setStartingSetNumber(setNumber);
      const attempt = await createMockTestAttempt(setNumber);
      navigate(`/mock-test/${setNumber}/attempt/${attempt.attemptId}`);
    } catch (err) {
      console.error('Failed to retake mock test set:', err);
    } finally {
      setStartingSetNumber(null);
    }
  };

  // Filter sets based on search and tab
  const filteredSets = sets.filter((set) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(set.setNumber).includes(searchQuery.trim());

    if (!matchesSearch) return false;

    if (filterTab === 'completed') {
      return set.attemptsCount > 0;
    }
    if (filterTab === 'unattempted') {
      return set.attemptsCount === 0 && !set.hasActiveAttempt;
    }
    if (filterTab === 'active') {
      return set.hasActiveAttempt;
    }
    return true;
  });

  const completedCount = sets.filter((s) => s.attemptsCount > 0).length;
  const inProgressCount = sets.filter((s) => s.hasActiveAttempt).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Swiss Editorial Hero Masthead */}
      <div className="swiss-card p-6 sm:p-8 bg-[#FFFFFF] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#D9D2C5]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-[#D96836] font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#D96836] animate-pulse" />
              <span>NPTEL 2026 Examination Environment • Course NOC26-GE04</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-[#191919] tracking-tight leading-tight">
              Psychology of Learning Mock Tests
            </h1>
            <p className="text-[#66645F] text-xs sm:text-sm mt-2 leading-relaxed">
              Complete computer-based mock testing environment featuring 50 distinct examination sets.
              Each set dynamically draws 50 unique questions from our curated 140-question bank with a 60-minute countdown timer, official CBT palette navigation, and instant pedagogical review. Open access for all candidates.
            </p>
          </div>

          {/* Quick Metrics Headline Cards: Swiss Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 font-mono text-xs">
            <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] min-w-[120px]">
              <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
                Mock Test Sets
              </span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#191919] mt-1 block">
                {MOCK_TEST_CONFIG.TOTAL_SETS}
              </span>
              <span className="text-[10px] text-[#65715B] font-semibold mt-1 flex items-center">
                <Layers className="w-3 h-3 mr-1" />
                Sets 01 – 50
              </span>
            </div>

            <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] min-w-[120px]">
              <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
                Per Set
              </span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#D96836] mt-1 block">
                {MOCK_TEST_CONFIG.QUESTIONS_PER_TEST}
              </span>
              <span className="text-[10px] text-[#66645F] mt-1 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                60 Minutes
              </span>
            </div>

            <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] min-w-[120px]">
              <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
                Full Mock Test
              </span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#D96836] mt-1 block">
                140
              </span>
              <span className="text-[10px] text-[#66645F] mt-1 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                180 Minutes
              </span>
            </div>

            <div className="p-4 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] min-w-[120px]">
              <span className="text-[10px] text-[#66645F] uppercase tracking-wider block font-bold">
                Question Bank
              </span>
              <span className="font-display font-bold text-2xl sm:text-3xl text-[#65715B] mt-1 block">
                {MOCK_TEST_CONFIG.TOTAL_BANK_QUESTIONS}
              </span>
              <span className="text-[10px] text-[#66645F] mt-1 block">
                Curated MCQs
              </span>
            </div>
          </div>
        </div>

        {/* Quick Access Toolbar Strip */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#66645F]">
          <div className="flex items-center space-x-4">
            <span className="text-[#191919]">
              Mode: <strong className="font-sans text-[#65715B]">Open Access (No Sign-In Required)</strong>
            </span>
            <span>•</span>
            <span>
              Progress: <strong className="text-[#191919]">{completedCount} of 50</strong> sets completed
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleStartFullMock}
              className="swiss-tag bg-[#FAF7F0] hover:bg-[#F0ECE1] text-[#191919] border-[#191919] flex items-center space-x-1.5 font-bold cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3 text-[#D96836]" />
              <span>Full Mock Test (140 Qs • 180 Mins)</span>
            </button>
            <Link
              to="/question-bank"
              className="swiss-tag bg-white hover:bg-[#FAF7F0] text-[#D96836] border-[#D96836] flex items-center space-x-1"
            >
              <BookOpen className="w-3 h-3" />
              <span>Browse Question Bank ({MOCK_TEST_CONFIG.TOTAL_BANK_QUESTIONS})</span>
            </Link>
            <span className="swiss-tag bg-white">No Negative Marking</span>
          </div>
        </div>
      </div>

      {/* Top Section Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#D9D2C5] pb-2 font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveMainSection('all')}
          className={`px-3.5 py-1.5 rounded-[2px] transition-all whitespace-nowrap flex items-center space-x-1.5 ${
            activeMainSection === 'all'
              ? 'bg-[#191919] text-white font-bold'
              : 'bg-white text-[#66645F] hover:bg-[#FAF7F0] border border-[#D9D2C5]'
          }`}
        >
          <span>All Examination Options</span>
        </button>

        <button
          onClick={() => setActiveMainSection('full-mock')}
          className={`px-3.5 py-1.5 rounded-[2px] transition-all whitespace-nowrap flex items-center space-x-1.5 ${
            activeMainSection === 'full-mock'
              ? 'bg-[#D96836] text-white font-bold'
              : 'bg-white text-[#D96836] hover:bg-[#FDF2EC] border border-[#D96836]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Full Question Bank Mock Test (140 Qs)</span>
        </button>

        <button
          onClick={() => setActiveMainSection('50-sets')}
          className={`px-3.5 py-1.5 rounded-[2px] transition-all whitespace-nowrap flex items-center space-x-1.5 ${
            activeMainSection === '50-sets'
              ? 'bg-[#191919] text-white font-bold'
              : 'bg-white text-[#66645F] hover:bg-[#FAF7F0] border border-[#D9D2C5]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>50 Mock Tests (Sets 01–50)</span>
        </button>

        <Link
          to="/question-bank"
          className="px-3.5 py-1.5 rounded-[2px] transition-all whitespace-nowrap flex items-center space-x-1.5 bg-white text-[#66645F] hover:bg-[#FAF7F0] border border-[#D9D2C5]"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Question Bank Repository (140)</span>
        </Link>
      </div>

      {/* SECTION 1: Full Question Bank Mock Test (140 Questions) Showcase Card */}
      {(activeMainSection === 'all' || activeMainSection === 'full-mock') && (
        <section
          id="full-mock-test-section"
          className="swiss-card p-6 sm:p-8 bg-[#FFFFFF] border-2 border-[#191919] shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-[#D96836]" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pl-2 sm:pl-3">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-2 font-mono text-xs">
                <span className="px-2.5 py-0.5 bg-[#D96836] text-white font-bold rounded-[2px] uppercase tracking-wider text-[10px]">
                  GRAND MOCK EXAMINATION
                </span>
                <span className="px-2 py-0.5 bg-[#FAF7F0] border border-[#D9D2C5] text-[#191919] font-bold rounded-[2px] text-[10px]">
                  ALL 140 QUESTIONS
                </span>
                {fullMockSummary.hasActiveAttempt ? (
                  <span className="font-mono text-[10px] text-[#D96836] bg-[#FBF0EA] px-2 py-0.5 rounded-[2px] font-bold animate-pulse">
                    ● IN PROGRESS
                  </span>
                ) : fullMockSummary.attemptsCount > 0 ? (
                  <span className="font-mono text-[10px] text-[#65715B] bg-[#F0F3EE] px-2 py-0.5 rounded-[2px] font-bold border border-[#D9D2C5]">
                    Best: {fullMockSummary.bestPercentage}% ({fullMockSummary.attemptsCount} attempt{fullMockSummary.attemptsCount > 1 ? 's' : ''})
                  </span>
                ) : null}
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-[#191919] tracking-tight">
                Full Question Bank Mock Test
              </h2>
              <p className="text-[#66645F] text-xs sm:text-sm mt-1.5 font-sans leading-relaxed">
                Practice all 140 questions in one complete mock examination.
              </p>

              {/* Required Details Display Grid:
                  - Total Questions: 140
                  - Duration: 180 minutes
                  - Marks: 140
                  - Negative Marking: None
                  - Access: Open access, no sign-in required */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-5 font-mono text-xs">
                <div className="p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
                  <span className="text-[10px] text-[#66645F] uppercase font-bold block">Total Questions</span>
                  <span className="font-display font-bold text-xl text-[#191919] mt-0.5 block">140</span>
                  <span className="text-[10px] text-[#66645F]">Full Question Bank</span>
                </div>

                <div className="p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
                  <span className="text-[10px] text-[#66645F] uppercase font-bold block">Duration</span>
                  <span className="font-display font-bold text-xl text-[#D96836] mt-0.5 block">180 Mins</span>
                  <span className="text-[10px] text-[#66645F]">3-Hour Timed CBT</span>
                </div>

                <div className="p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
                  <span className="text-[10px] text-[#66645F] uppercase font-bold block">Marks</span>
                  <span className="font-display font-bold text-xl text-[#191919] mt-0.5 block">140</span>
                  <span className="text-[10px] text-[#65715B] font-semibold">+1 Mark / Question</span>
                </div>

                <div className="p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
                  <span className="text-[10px] text-[#66645F] uppercase font-bold block">Negative Marking</span>
                  <span className="font-display font-bold text-xl text-[#65715B] mt-0.5 block">None</span>
                  <span className="text-[10px] text-[#66645F]">Zero Negative Marking</span>
                </div>

                <div className="p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#66645F] uppercase font-bold block">Access</span>
                  <span className="font-sans font-bold text-xs text-[#65715B] mt-1 block">Open access</span>
                  <span className="text-[10px] text-[#66645F]">No sign-in required</span>
                </div>
              </div>

              {fullMockSummary.attemptsCount > 0 && fullMockSummary.latestScore !== null && (
                <div className="mt-4 p-2.5 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] font-mono text-[11px] text-[#191919] flex flex-wrap items-center justify-between gap-2">
                  <span>Previous Full Mock Score:</span>
                  <strong className="text-[#65715B]">
                    {fullMockSummary.latestScore} / 140 ({fullMockSummary.latestPercentage}%) • Best: {fullMockSummary.bestPercentage}%
                  </strong>
                </div>
              )}
            </div>

            {/* Action Buttons for Full Mock Test */}
            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[220px]">
              {fullMockSummary.hasActiveAttempt ? (
                <>
                  <button
                    onClick={handleStartFullMock}
                    disabled={isStartingFull}
                    className="w-full py-3 px-5 btn-primary-orange text-sm flex items-center justify-center space-x-2 font-display font-bold shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isStartingFull ? 'Resuming...' : 'Resume Full Mock Test'}</span>
                  </button>
                  <button
                    onClick={handleRetakeFullMock}
                    disabled={isStartingFull}
                    className="w-full py-2 px-3 btn-secondary-neutral text-xs flex items-center justify-center space-x-1 font-mono"
                    title="Start fresh 140-question attempt"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Start Fresh Attempt (140)</span>
                  </button>
                </>
              ) : fullMockSummary.attemptsCount > 0 ? (
                <>
                  <button
                    onClick={handleStartFullMock}
                    disabled={isStartingFull}
                    className="w-full py-3 px-5 btn-primary-orange text-sm flex items-center justify-center space-x-2 font-display font-bold shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isStartingFull ? 'Preparing 140 Questions...' : 'Start Full Mock Test'}</span>
                  </button>
                  <button
                    onClick={handleRetakeFullMock}
                    disabled={isStartingFull}
                    className="w-full py-2 px-3 btn-secondary-neutral text-xs flex items-center justify-center space-x-1 font-mono"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Full Test (140 Qs)</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartFullMock}
                  disabled={isStartingFull}
                  className="w-full py-3.5 px-6 btn-primary-orange text-sm sm:text-base flex items-center justify-center space-x-2 font-display font-bold shadow-md hover:scale-[1.01] transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isStartingFull ? 'Preparing 140 Questions...' : 'Start Full Mock Test'}</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: 50 Mock Tests (Sets 01–50) */}
      {(activeMainSection === 'all' || activeMainSection === '50-sets') && (
        <div className="space-y-6">

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFFFF] p-3 border border-[#D9D2C5] rounded-[2px]">
        {/* Tab Filters */}
        <div className="flex items-center space-x-1 font-mono text-xs overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-[2px] transition-all whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-[#191919] text-white font-bold'
                : 'text-[#66645F] hover:bg-[#FAF7F0]'
            }`}
          >
            All Sets ({sets.length})
          </button>
          <button
            onClick={() => setFilterTab('unattempted')}
            className={`px-3 py-1.5 rounded-[2px] transition-all whitespace-nowrap ${
              filterTab === 'unattempted'
                ? 'bg-[#191919] text-white font-bold'
                : 'text-[#66645F] hover:bg-[#FAF7F0]'
            }`}
          >
            Not Attempted ({sets.length - completedCount})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 rounded-[2px] transition-all whitespace-nowrap ${
              filterTab === 'completed'
                ? 'bg-[#191919] text-white font-bold'
                : 'text-[#66645F] hover:bg-[#FAF7F0]'
            }`}
          >
            Completed ({completedCount})
          </button>
          {inProgressCount > 0 && (
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1.5 rounded-[2px] transition-all whitespace-nowrap text-[#D96836] font-bold ${
                filterTab === 'active'
                  ? 'bg-[#D96836] text-white'
                  : 'hover:bg-[#FAF7F0]'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#66645F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search set (e.g. 05, 42)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] focus:outline-none focus:border-[#191919] font-mono"
          />
        </div>
      </div>

      {/* Grid of 50 Sets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-[#191919] flex items-center space-x-2">
            <span>Available Mock Test Sets</span>
            <span className="text-xs font-mono font-normal text-[#66645F]">
              ({filteredSets.length} sets displayed)
            </span>
          </h2>
          <span className="text-xs font-mono text-[#66645F] hidden sm:inline">
            50 Questions • 60 Minutes • Instant Analysis
          </span>
        </div>

        {filteredSets.length === 0 ? (
          <div className="swiss-card p-12 text-center text-[#66645F] font-mono text-xs">
            No mock test sets match the filter "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSets.map((set) => {
              const isStarting = startingSetNumber === set.setNumber;
              const hasAttempted = set.attemptsCount > 0;
              const isActive = set.hasActiveAttempt;

              return (
                <div
                  key={set.setNumber}
                  className={`swiss-card p-5 bg-[#FFFFFF] flex flex-col justify-between hover:border-[#191919] transition-all group shadow-sm ${
                    isActive ? 'border-[#D96836] ring-1 ring-[#D96836]' : ''
                  }`}
                >
                  <div>
                    {/* Top Tag Row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-[11px] font-bold text-[#191919] bg-[#FAF7F0] px-2 py-0.5 border border-[#D9D2C5] rounded-[2px]">
                        SET #{String(set.setNumber).padStart(2, '0')}
                      </span>
                      {isActive ? (
                        <span className="font-mono text-[10px] text-[#D96836] bg-[#FBF0EA] px-2 py-0.5 rounded-[2px] font-bold animate-pulse">
                          ● IN PROGRESS
                        </span>
                      ) : hasAttempted ? (
                        <span className="font-mono text-[10px] text-[#65715B] bg-[#F0F3EE] px-2 py-0.5 rounded-[2px] font-bold border border-[#D9D2C5]">
                          Best: {set.bestPercentage}%
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-[#66645F] bg-[#FAF7F0] px-1.5 py-0.5 rounded-[2px]">
                          READY
                        </span>
                      )}
                    </div>

                    {/* Set Title */}
                    <h3 className="font-display font-bold text-base text-[#191919] group-hover:text-[#D96836] transition-colors leading-tight">
                      {set.title}
                    </h3>
                    <p className="text-[#66645F] text-[11px] mt-1 font-sans">
                      Randomly draws 50 questions from the 140 question bank.
                    </p>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#D9D2C5] font-mono text-[11px] text-[#66645F]">
                      <div className="flex items-center space-x-1">
                        <FileQuestion className="w-3.5 h-3.5 text-[#191919]" />
                        <span>50 Questions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-[#191919]" />
                        <span>60 Mins</span>
                      </div>
                    </div>

                    {hasAttempted && (
                      <div className="mt-3 p-2 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px] font-mono text-[10px] text-[#191919] flex items-center justify-between">
                        <span>Latest Score:</span>
                        <strong className="text-[#65715B]">
                          {set.latestScore} / 50 ({set.latestPercentage}%)
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-2">
                    {isActive ? (
                      <button
                        onClick={() => handleStartSet(set)}
                        disabled={isStarting}
                        className="w-full py-2 px-3 btn-primary-orange text-xs flex items-center justify-center space-x-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isStarting ? 'Resuming...' : 'Resume Attempt'}</span>
                      </button>
                    ) : hasAttempted ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartSet(set)}
                          disabled={isStarting}
                          className="flex-1 py-2 px-2 btn-secondary-neutral text-xs flex items-center justify-center space-x-1"
                          title="Start fresh attempt"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retake Set</span>
                        </button>
                        <button
                          onClick={() => handleStartSet(set)}
                          disabled={isStarting}
                          className="py-2 px-3 btn-primary-orange text-xs"
                          title="Launch test"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartSet(set)}
                        disabled={isStarting}
                        className="w-full py-2 px-3 btn-primary-orange text-xs flex items-center justify-center space-x-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isStarting ? 'Preparing 50 Questions...' : 'Start Test'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )}
</div>
);
}

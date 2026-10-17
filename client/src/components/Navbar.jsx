import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  BarChart3,
  LogOut,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, isTeacher } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isFullMockActive =
    location.pathname === '/full-mock-test' ||
    location.pathname.startsWith('/mock-test/full');

  const isMockTestsActive =
    (location.pathname === '/' ||
      location.pathname === '/dashboard' ||
      location.pathname === '/mock-tests' ||
      (location.pathname.startsWith('/mock-test') && !location.pathname.startsWith('/mock-test/full'))) &&
    !isFullMockActive;

  const isQuestionBankActive = location.pathname === '/question-bank';

  return (
    <header className="bg-[#FFFFFF] border-b border-[#D9D2C5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Swiss Title */}
          <div className="flex items-center space-x-6 sm:space-x-8">
            <Link
              to="/"
              className="flex items-center space-x-3 group focus:outline-none"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#D96836] text-white flex items-center justify-center font-display font-bold text-lg select-none rounded-[2px] shadow-sm">
                Ψ
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-base sm:text-lg text-[#191919] leading-tight tracking-tight">
                  Psychology of Learning
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono text-[#66645F] tracking-wide">
                  NPTEL 2026 • 50-Set Mock Exam Portal
                </span>
              </div>
            </Link>

            {/* Navigation Links - Swiss Grid Tabs */}
            <nav className="hidden md:flex items-center space-x-1 text-xs font-medium">
              <Link
                to="/"
                className={`px-3.5 py-1.5 rounded-[2px] transition-all flex items-center space-x-1.5 ${
                  isMockTestsActive
                    ? 'bg-[#F5F0E6] text-[#D96836] font-semibold border border-[#D9D2C5]'
                    : 'text-[#66645F] hover:text-[#191919] hover:bg-[#F5F0E6]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>50 Mock Tests</span>
              </Link>

              <Link
                to="/full-mock-test"
                className={`px-3.5 py-1.5 rounded-[2px] transition-all flex items-center space-x-1.5 ${
                  isFullMockActive
                    ? 'bg-[#F5F0E6] text-[#D96836] font-semibold border border-[#D9D2C5]'
                    : 'text-[#66645F] hover:text-[#191919] hover:bg-[#F5F0E6]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Full Mock Test (140)</span>
              </Link>

              <Link
                to="/question-bank"
                className={`px-3.5 py-1.5 rounded-[2px] transition-all flex items-center space-x-1.5 ${
                  isQuestionBankActive
                    ? 'bg-[#F5F0E6] text-[#D96836] font-semibold border border-[#D9D2C5]'
                    : 'text-[#66645F] hover:text-[#191919] hover:bg-[#F5F0E6]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Question Bank (140)</span>
              </Link>

              {user && (
                <Link
                  to="/analytics"
                  className={`px-3.5 py-1.5 rounded-[2px] transition-all flex items-center space-x-1.5 ${
                    location.pathname === '/analytics'
                      ? 'bg-[#F5F0E6] text-[#D96836] font-semibold border border-[#D9D2C5]'
                      : 'text-[#66645F] hover:text-[#191919] hover:bg-[#F5F0E6]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>My Analytics</span>
                </Link>
              )}

              {isTeacher && (
                <Link
                  to="/teacher"
                  className={`px-3.5 py-1.5 rounded-[2px] transition-all flex items-center space-x-1.5 ${
                    location.pathname === '/teacher'
                      ? 'bg-[#F5F0E6] text-[#D96836] font-semibold border border-[#D9D2C5]'
                      : 'text-[#66645F] hover:text-[#191919] hover:bg-[#F5F0E6]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Faculty Console</span>
                </Link>
              )}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 bg-[#F5F0E6] border border-[#D9D2C5] rounded-[2px] text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#65715B]" />
                  <div className="text-left text-[11px] font-mono leading-tight">
                    <span className="font-semibold text-[#191919]">{user.name}</span>
                    <span className="text-[#66645F] ml-1 uppercase text-[10px]">[{user.role}]</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-secondary-neutral px-3 py-1 text-xs flex items-center space-x-1 text-[#66645F] hover:text-[#191919]"
                  title="Sign Out of Session"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-mono text-[11px]">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1 bg-[#F0F3EE] border border-[#D9D2C5] rounded-[2px] text-xs font-mono text-[#65715B]">
                <span className="w-2 h-2 rounded-full bg-[#65715B] animate-pulse" />
                <span className="font-semibold">Candidate Portal • Open Access</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="md:hidden flex items-center space-x-1 pb-2 pt-1 border-t border-[#D9D2C5] text-xs font-medium">
          <Link
            to="/"
            className={`flex-1 text-center py-1 rounded-[2px] ${
              isMockTestsActive
                ? 'bg-[#F5F0E6] text-[#D96836] font-bold border border-[#D9D2C5]'
                : 'text-[#66645F]'
            }`}
          >
            50 Mock Tests
          </Link>
          <Link
            to="/full-mock-test"
            className={`flex-1 text-center py-1 rounded-[2px] ${
              isFullMockActive
                ? 'bg-[#F5F0E6] text-[#D96836] font-bold border border-[#D9D2C5]'
                : 'text-[#66645F]'
            }`}
          >
            Full Mock (140)
          </Link>
          <Link
            to="/question-bank"
            className={`flex-1 text-center py-1 rounded-[2px] ${
              isQuestionBankActive
                ? 'bg-[#F5F0E6] text-[#D96836] font-bold border border-[#D9D2C5]'
                : 'text-[#66645F]'
            }`}
          >
            Question Bank
          </Link>
          {user && (
            <Link
              to="/analytics"
              className={`flex-1 text-center py-1 rounded-[2px] ${
                location.pathname === '/analytics'
                  ? 'bg-[#F5F0E6] text-[#D96836] font-bold border border-[#D9D2C5]'
                  : 'text-[#66645F]'
              }`}
            >
              Analytics
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

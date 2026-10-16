import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

// 50-Set Mock Test Suite & Question Bank Pages (Open Access)
import { MockTestDashboard } from './pages/MockTestDashboard';
import { MockTestRunner } from './pages/MockTestRunner';
import { MockTestResult } from './pages/MockTestResult';
import { QuestionBankView } from './pages/QuestionBankView';

// Existing Platform Pages (Accessible without login guards)
import { StudentAnalytics } from './pages/StudentAnalytics';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherAnalytics } from './pages/TeacherAnalytics';
import { TestRunner } from './pages/TestRunner';
import { ResultReview } from './pages/ResultReview';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F5F0E6] text-[#191919] flex flex-col font-sans antialiased selection:bg-[#D96836] selection:text-[#FFFFFF]">
          {/* Top Swiss Academic Metadata Strip */}
          <div className="bg-[#191919] text-[#D9D2C5] text-[11px] font-mono px-4 py-1.5 flex items-center justify-between border-b border-[#30302D] tracking-wider select-none">
            <div className="flex items-center space-x-3 truncate">
              <span className="text-[#D96836] font-bold">● LIVE</span>
              <span className="font-semibold text-white">NPTEL 2026</span>
              <span className="text-[#66645F] hidden sm:inline">/</span>
              <span className="hidden sm:inline text-[#E0D9CD]">Psychology of Learning</span>
              <span className="text-[#66645F] hidden md:inline">|</span>
              <span className="hidden md:inline text-[#A8A295]">50-Set Computer-Based Mock Exam Platform</span>
            </div>
            <div className="flex items-center space-x-4 text-[10px] shrink-0 font-mono">
              <span className="hidden lg:inline text-[#A8A295]">QUESTION BANK: 140 MCQs</span>
              <span className="px-1.5 py-0.5 bg-[#65715B] text-white font-semibold rounded-[2px]">CBT ENGINE v2.6 • OPEN ACCESS</span>
            </div>
          </div>

          <Navbar />

          <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
            <Routes>
              {/* Core 50-Set Mock Test Routes — Open Access without authentication */}
              <Route path="/" element={<MockTestDashboard />} />
              <Route path="/dashboard" element={<MockTestDashboard />} />
              <Route path="/mock-tests" element={<MockTestDashboard />} />
              <Route path="/question-bank" element={<QuestionBankView />} />

              <Route
                path="/mock-test/:setNumber"
                element={<MockTestRunner />}
              />
              <Route
                path="/mock-test/:setNumber/attempt/:attemptId"
                element={<MockTestRunner />}
              />
              <Route
                path="/mock-test/:setNumber/result/:attemptId"
                element={<MockTestResult />}
              />

              {/* Legacy attempt routes (made accessible without auth guard) */}
              <Route path="/test/:attemptId" element={<TestRunner />} />
              <Route path="/test/:attemptId/result" element={<ResultReview />} />
              <Route path="/analytics" element={<StudentAnalytics />} />

              {/* Faculty Console (restricted to teacher role) */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/quiz/:quizId/analytics"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherAnalytics />
                  </ProtectedRoute>
                }
              />

              {/* Remove Sign In / Sign Up: redirect any obsolete /login or /register requests directly to home */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Restrained Swiss Academic Footer */}
          <footer className="mt-auto border-t border-[#D9D2C5] bg-[#FFFFFF] py-4 px-4 text-xs text-[#66645F]">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
              <div>
                <span className="font-bold text-[#191919] font-sans text-xs mr-2">Psychology of Learning</span>
                <span>NPTEL 2026 Examination Environment • 50 Mock Test Sets • 140 Question Repository</span>
              </div>
              <div className="flex items-center space-x-3 text-[10px]">
                <span className="border border-[#D9D2C5] px-2 py-0.5 bg-[#F5F0E6] text-[#191919]">SWISS GRID LAYOUT</span>
                <span className="border border-[#D9D2C5] px-2 py-0.5 bg-[#F5F0E6] text-[#191919]">OFFICIAL CBT ENGINE</span>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

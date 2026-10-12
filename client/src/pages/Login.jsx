import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, Key, UserCheck } from 'lucide-react';

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        const user = await register(name, email, password, role);
        navigate(user.role === 'teacher' ? '/teacher' : '/dashboard');
      } else {
        const user = await login(email, password);
        navigate(user.role === 'teacher' ? '/teacher' : '/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setError('');
    setSubmitting(true);
    try {
      const user = await login(demoEmail, demoPassword);
      navigate(user.role === 'teacher' ? '/teacher' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center py-6 sm:py-10 px-3 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Emblem & Editorial Masthead */}
        <div className="text-center">
          <div className="inline-flex p-1 bg-[#FFFFFF] border border-[#D9D2C5] rounded-[2px] shadow-sm mb-3">
            <div className="w-12 h-12 bg-[#D96836] text-white flex items-center justify-center font-display font-bold text-2xl select-none rounded-[2px]">
              Ψ
            </div>
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#D96836] font-bold">
            NPTEL 2026 Examination Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#191919] tracking-tight mt-1">
            Psychology of Learning (PsyPrep)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#66645F] font-sans">
            Online Mock Test & Quiz Engine for Schools & Colleges
          </p>
          <div className="mt-2 inline-block px-2.5 py-0.5 bg-[#FFFFFF] border border-[#D9D2C5] text-[11px] font-mono text-[#66645F] rounded-[2px]">
            COMPUTER-BASED EXAMINATION (CBT) PLATFORM
          </div>
        </div>

        {/* Swiss Grid Authentication Card */}
        <div className="mt-6 bg-[#FFFFFF] border border-[#D9D2C5] rounded-[2px] shadow-sm">
          {/* Card Top Title Bar */}
          <div className="bg-[#FAF7F0] border-b border-[#D9D2C5] px-5 py-2.5 flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-[#191919]">AUTHENTICATION GATEWAY</span>
            <span className="text-[#65715B] font-bold">● SECURE TLS 1.3</span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Swiss Tab Switches */}
            <div className="flex border-b border-[#D9D2C5] mb-5 text-xs font-display">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                className={`px-4 py-2 font-bold transition-colors border-b-2 ${
                  !isRegister
                    ? 'border-[#D96836] text-[#D96836] bg-[#FAF7F0]'
                    : 'border-transparent text-[#66645F] hover:text-[#191919]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                }}
                className={`px-4 py-2 font-bold transition-colors border-b-2 ml-1 ${
                  isRegister
                    ? 'border-[#D96836] text-[#D96836] bg-[#FAF7F0]'
                    : 'border-transparent text-[#66645F] hover:text-[#191919]'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#FDF2EC] border border-[#D96836] text-[#D96836] text-xs font-mono flex items-center space-x-2 rounded-[2px]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {isRegister && (
                <div>
                  <label className="block font-semibold text-[#191919] mb-1 font-sans">
                    Full Candidate Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#D9D2C5] text-[#191919] font-sans rounded-[2px] focus:outline-none focus:border-[#D96836] focus:ring-1 focus:ring-[#D96836]"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#191919] mb-1 font-sans">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@institution.edu"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9D2C5] text-[#191919] font-sans rounded-[2px] focus:outline-none focus:border-[#D96836] focus:ring-1 focus:ring-[#D96836]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#191919] mb-1 font-sans">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9D2C5] text-[#191919] font-mono rounded-[2px] focus:outline-none focus:border-[#D96836] focus:ring-1 focus:ring-[#D96836]"
                />
              </div>

              {isRegister && (
                <div>
                  <label className="block font-semibold text-[#191919] mb-1 font-sans">
                    Account Affiliation / Role
                  </label>
                  <div className="grid grid-cols-2 gap-2 font-display text-xs">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2 px-2 border text-center font-bold rounded-[2px] transition-all ${
                        role === 'student'
                          ? 'bg-[#65715B] text-white border-[#65715B]'
                          : 'bg-white text-[#66645F] border-[#D9D2C5] hover:border-[#191919]'
                      }`}
                    >
                      Student Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`py-2 px-2 border text-center font-bold rounded-[2px] transition-all ${
                        role === 'teacher'
                          ? 'bg-[#65715B] text-white border-[#65715B]'
                          : 'bg-white text-[#66645F] border-[#D9D2C5] hover:border-[#191919]'
                      }`}
                    >
                      Faculty / Teacher
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 py-2.5 px-4 btn-primary-orange text-sm flex items-center justify-center space-x-2"
              >
                <span>
                  {submitting
                    ? 'Processing...'
                    : isRegister
                    ? 'Register Candidate →'
                    : 'Enter Examination Platform →'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Credentials in Swiss Grid layout */}
            <div className="mt-6 pt-5 border-t border-[#D9D2C5]">
              <div className="text-center font-mono text-[11px] font-bold text-[#66645F] mb-2 uppercase tracking-wider">
                1-Click Fast Demo Credentials
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('student@psyprep.edu', 'Password123!')}
                  disabled={submitting}
                  className="p-2.5 bg-[#FAF7F0] hover:bg-[#F5F0E6] border border-[#D9D2C5] rounded-[2px] text-left transition-all"
                >
                  <div className="font-bold text-[#65715B] flex items-center space-x-1.5 font-display">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Student Candidate</span>
                  </div>
                  <div className="text-[10px] text-[#66645F] mt-0.5 font-mono">
                    student@psyprep.edu
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('teacher@psyprep.edu', 'Password123!')}
                  disabled={submitting}
                  className="p-2.5 bg-[#FAF7F0] hover:bg-[#F5F0E6] border border-[#D9D2C5] rounded-[2px] text-left transition-all"
                >
                  <div className="font-bold text-[#D96836] flex items-center space-x-1.5 font-display">
                    <Key className="w-3.5 h-3.5" />
                    <span>Faculty / Admin</span>
                  </div>
                  <div className="text-[10px] text-[#66645F] mt-0.5 font-mono">
                    teacher@psyprep.edu
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  FileUp,
  BarChart3,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export function TeacherDashboard() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // Form states
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    subject: 'Psychology',
    durationMinutes: 30,
    marksPerQuestion: 1,
    allowRetakes: true,
    isPublished: true,
  });

  const [importForm, setImportForm] = useState({
    format: 'json', // 'json' | 'csv'
    payload: '',
  });

  const [questionForm, setQuestionForm] = useState({
    stem: '',
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ],
    correctAnswer: 'A',
    marks: 1,
    explanation: '',
    subject: 'Psychology',
    topic: 'General',
    difficulty: 'medium',
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/api/quizzes');
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Create Quiz
  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/quizzes', quizForm);
      setShowCreateModal(false);
      setActionSuccess('Quiz created successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      loadQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to create quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (quizId, currentStatus) => {
    try {
      await api.post(`/api/quizzes/${quizId}/publish`, { isPublished: !currentStatus });
      loadQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to update publish state');
    }
  };

  // Bulk Import
  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    setSubmitting(true);
    setError('');
    try {
      let body = {};
      if (importForm.format === 'json') {
        const parsed = JSON.parse(importForm.payload);
        body = { questions: Array.isArray(parsed) ? parsed : parsed.questions };
      } else {
        body = { csvData: importForm.payload };
      }

      const res = await api.post(`/api/quizzes/${selectedQuiz._id}/questions/import`, body);
      setShowImportModal(false);
      setImportForm({ format: 'json', payload: '' });
      setActionSuccess(`Successfully imported ${res.importedCount} questions!`);
      setTimeout(() => setActionSuccess(''), 3000);
      loadQuizzes();
    } catch (err) {
      setError(err.message || 'Import failed. Verify format structure.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Question
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/quizzes/${selectedQuiz._id}/questions`, questionForm);
      setShowAddQuestionModal(false);
      setActionSuccess('Question added successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      loadQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  // Seed / Re-sync Database
  const handleSyncSeed = async () => {
    if (!window.confirm('Re-seed the database with all 130 official NPTEL questions and master mock test?')) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/api/quizzes/seed');
      setActionSuccess(res.message || 'Successfully seeded database with 130 questions!');
      setTimeout(() => setActionSuccess(''), 4000);
      loadQuizzes();
    } catch (err) {
      setError(err.message || 'Failed to seed database');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="swiss-card p-8 inline-block shadow-sm">
          <div className="font-mono text-sm text-[#191919] animate-pulse">
            Loading Faculty Management Console...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="swiss-card bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#D9D2C5]">
          <div>
            <div className="text-[11px] font-mono text-[#D96836] font-bold uppercase tracking-wider mb-1">
              Faculty Administration Hub • NPTEL 2026
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#191919]">
              Curriculum & Examination Management
            </h1>
            <p className="text-[#66645F] text-xs sm:text-sm mt-1 max-w-2xl">
              Author and publish mock tests, upload question banks via bulk JSON/CSV format, and view cohort analytics.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleSyncSeed}
              disabled={submitting}
              className="py-2.5 px-3.5 btn-secondary-neutral text-xs flex items-center space-x-1.5"
              title="Ensure all 130 official questions and master mock test are active in the database"
            >
              <FileUp className="w-4 h-4" />
              <span>Seed / Re-sync Questions</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-4 btn-primary-orange text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quiz</span>
            </button>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-[#EFF2ED] border border-[#65715B] text-[#65715B] font-mono text-xs flex items-center space-x-2 rounded-[2px]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-[#FDF2EC] border border-[#D96836] text-[#D96836] font-mono text-xs flex items-center space-x-2 rounded-[2px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quizzes.map((quiz) => (
          <div
            key={quiz._id}
            className="swiss-card bg-white p-6 shadow-sm flex flex-col justify-between hover:border-[#191919] transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3 font-mono text-[10px]">
                <span className="swiss-tag bg-[#FAF7F0] text-[#191919]">
                  {quiz.subject || 'GENERAL'}
                </span>

                <button
                  onClick={() => handleTogglePublish(quiz._id, quiz.isPublished)}
                  className={`px-2.5 py-0.5 border rounded-[2px] font-bold flex items-center space-x-1 transition-all ${
                    quiz.isPublished
                      ? 'bg-[#EFF2ED] text-[#65715B] border-[#65715B]'
                      : 'bg-[#FAF7F0] text-[#66645F] border-[#D9D2C5]'
                  }`}
                >
                  {quiz.isPublished ? (
                    <>
                      <Globe className="w-3 h-3" />
                      <span>Published</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Draft</span>
                    </>
                  )}
                </button>
              </div>

              <h2 className="font-display font-bold text-lg text-[#191919] line-clamp-2 leading-snug">
                {quiz.title}
              </h2>
              <p className="text-[#66645F] text-xs mt-1.5 font-sans line-clamp-2 leading-relaxed">
                {quiz.description || 'Timed student assessment.'}
              </p>

              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[#D9D2C5] font-mono text-[11px] text-[#66645F]">
                <div>
                  <span className="text-[9px] uppercase block">Questions</span>
                  <span className="font-bold text-[#191919]">{quiz.questions?.length || 0}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase block">Duration</span>
                  <span className="font-bold text-[#191919]">{quiz.durationMinutes}m</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase block">Total Marks</span>
                  <span className="font-bold text-[#191919]">{quiz.totalMarks || 0}</span>
                </div>
              </div>
            </div>

            {/* Teacher Actions */}
            <div className="mt-6 pt-3 border-t border-[#D9D2C5] flex flex-wrap gap-2 font-display text-xs">
              <button
                onClick={() => {
                  setSelectedQuiz(quiz);
                  setShowImportModal(true);
                }}
                className="flex-1 py-1.5 px-2 btn-secondary-neutral flex items-center justify-center space-x-1"
                title="Bulk Import Questions"
              >
                <FileUp className="w-3.5 h-3.5 text-[#D96836]" />
                <span>Bulk Import</span>
              </button>

              <button
                onClick={() => {
                  setSelectedQuiz(quiz);
                  setShowAddQuestionModal(true);
                }}
                className="flex-1 py-1.5 px-2 btn-secondary-neutral flex items-center justify-center space-x-1"
                title="Add Single Question"
              >
                <Plus className="w-3.5 h-3.5 text-[#65715B]" />
                <span>+ Question</span>
              </button>

              <Link
                to={`/teacher/quiz/${quiz._id}/analytics`}
                className="w-full py-1.5 px-2 bg-[#FAF7F0] hover:bg-[#F5F0E6] border border-[#D9D2C5] rounded-[2px] font-bold text-[#D96836] flex items-center justify-center space-x-1 text-center transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>View Cohort Analytics →</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Quiz */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191919]/60 backdrop-blur-xs">
          <div className="swiss-card max-w-lg w-full p-6 sm:p-7 relative bg-white shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D2C5] mb-4">
              <h3 className="font-display font-bold text-lg text-[#191919]">
                Create New Examination Paper
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#66645F] hover:text-[#191919]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#191919] font-bold mb-1 font-sans">
                  Examination Title
                </label>
                <input
                  type="text"
                  required
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="e.g. Psychology of Learning NPTEL Mock 2"
                  className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] font-sans focus:outline-none focus:border-[#D96836]"
                />
              </div>

              <div>
                <label className="block text-[#191919] font-bold mb-1 font-sans">
                  Description
                </label>
                <textarea
                  rows="2"
                  value={quizForm.description}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, description: e.target.value })
                  }
                  placeholder="Brief synopsis of topics covered..."
                  className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] font-sans focus:outline-none focus:border-[#D96836]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#191919] font-bold mb-1 font-sans">
                    Subject Area
                  </label>
                  <input
                    type="text"
                    value={quizForm.subject}
                    onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[#191919] font-bold mb-1 font-sans">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quizForm.durationMinutes}
                    onChange={(e) =>
                      setQuizForm({
                        ...quizForm,
                        durationMinutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
                <span className="font-bold text-[#191919] font-sans">Allow Unlimited Retakes</span>
                <input
                  type="checkbox"
                  checked={quizForm.allowRetakes}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, allowRetakes: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#D96836]"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FAF7F0] border border-[#D9D2C5] rounded-[2px]">
                <span className="font-bold text-[#191919] font-sans">Publish Immediately</span>
                <input
                  type="checkbox"
                  checked={quizForm.isPublished}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, isPublished: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#D96836]"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 btn-secondary-neutral"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 btn-primary-orange"
                >
                  {submitting ? 'Creating...' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Import Questions */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191919]/60 backdrop-blur-xs">
          <div className="swiss-card max-w-xl w-full p-6 sm:p-7 relative bg-white shadow-xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D2C5] mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-[#191919]">
                  Bulk Import Questions
                </h3>
                <span className="text-[#66645F] font-mono text-[11px]">
                  Target Paper: {selectedQuiz?.title}
                </span>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[#66645F] hover:text-[#191919]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div className="flex border border-[#D9D2C5] rounded-[2px] font-display">
                <button
                  type="button"
                  onClick={() => setImportForm({ ...importForm, format: 'json' })}
                  className={`flex-1 py-1.5 font-bold ${
                    importForm.format === 'json'
                      ? 'bg-[#191919] text-white'
                      : 'bg-white text-[#66645F]'
                  }`}
                >
                  JSON Format
                </button>
                <button
                  type="button"
                  onClick={() => setImportForm({ ...importForm, format: 'csv' })}
                  className={`flex-1 py-1.5 font-bold ${
                    importForm.format === 'csv'
                      ? 'bg-[#191919] text-white'
                      : 'bg-white text-[#66645F]'
                  }`}
                >
                  CSV Format
                </button>
              </div>

              <div>
                <label className="block text-[#191919] font-bold mb-1 font-sans">
                  Paste {importForm.format.toUpperCase()} Payload
                </label>
                <textarea
                  rows="7"
                  required
                  value={importForm.payload}
                  onChange={(e) =>
                    setImportForm({ ...importForm, payload: e.target.value })
                  }
                  placeholder={
                    importForm.format === 'json'
                      ? '[\n  {\n    "stem": "Question text?",\n    "options": ["A", "B", "C", "D"],\n    "correctAnswer": "A",\n    "topic": "Cognitive"\n  }\n]'
                      : 'stem,optionA,optionB,optionC,optionD,correctAnswer,topic\n"What is 2+2?","3","4","5","6","B","Math"'
                  }
                  className="w-full font-mono text-[11px] p-2.5 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] focus:outline-none focus:border-[#D96836]"
                />
              </div>

              <div className="flex space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-2.5 btn-secondary-neutral"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 btn-primary-orange flex items-center justify-center space-x-1.5"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Importing...' : 'Execute Import'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Single Question */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191919]/60 backdrop-blur-xs">
          <div className="swiss-card max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto bg-white shadow-xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D2C5] mb-4">
              <h3 className="font-display font-bold text-base text-[#191919]">
                Add Single Question
              </h3>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="text-[#66645F] hover:text-[#191919]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4 font-sans">
              <div>
                <label className="block text-[#191919] font-bold mb-1">
                  Question Stem
                </label>
                <textarea
                  rows="2"
                  required
                  value={questionForm.stem}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, stem: e.target.value })
                  }
                  placeholder="Enter the item text here..."
                  className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919]"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block text-[#191919] font-bold">
                  Answer Options (A–D)
                </label>
                {questionForm.options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center space-x-2">
                    <span className="w-6 h-6 bg-[#FAF7F0] border border-[#D9D2C5] rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 text-[#191919]">
                      {opt.id}
                    </span>
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...questionForm.options];
                        newOpts[idx].text = e.target.value;
                        setQuestionForm({ ...questionForm, options: newOpts });
                      }}
                      placeholder={`Option ${opt.id} text`}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#191919] font-bold mb-1">
                    Correct Option Key
                  </label>
                  <select
                    value={questionForm.correctAnswer}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, correctAnswer: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] font-mono"
                  >
                    {questionForm.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        Option {o.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#191919] font-bold mb-1">
                    Topic Tag
                  </label>
                  <input
                    type="text"
                    value={questionForm.topic}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, topic: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#191919] font-bold mb-1">
                  Explanation / Pedagogical Notes
                </label>
                <textarea
                  rows="2"
                  value={questionForm.explanation}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, explanation: e.target.value })
                  }
                  placeholder="Notes shown to students upon test review..."
                  className="w-full px-3 py-2 bg-white border border-[#D9D2C5] rounded-[2px] text-[#191919] text-xs"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="flex-1 py-2.5 btn-secondary-neutral"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 btn-primary-orange"
                >
                  {submitting ? 'Saving...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

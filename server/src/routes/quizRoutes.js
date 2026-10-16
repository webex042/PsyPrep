import express from 'express';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createQuizSchema,
  updateQuizSchema,
  questionSchema,
} from '../validation/schemas.js';
import {
  importQuestionsIntoQuiz,
  parseQuestionsFromCSV,
} from '../services/importService.js';
import { finalizeAttempt } from '../services/scoringService.js';

const router = express.Router();

// GET /api/quizzes (students and guests see published, teachers see all or their own)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (!req.user || req.user.role === 'student') {
      filter.isPublished = true;
    } else if (req.user.role === 'teacher') {
      const onlyMine = req.query.mine === 'true';
      if (onlyMine) {
        filter.createdBy = req.user._id;
      }
    }

    const quizzes = await Quiz.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ quizzes });
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id (Public / Student gets safe student questions; teacher gets full)
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('questions');

    if (!quiz) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quiz not found' },
      });
    }

    const isStudentOrGuest = !req.user || req.user.role === 'student';

    if (isStudentOrGuest && !quiz.isPublished) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quiz is not published yet' },
      });
    }

    // Integrity: strip correctAnswer and explanation for students and guests
    if (isStudentOrGuest) {
      const studentQuestions = quiz.questions.map((q) =>
        typeof q.toStudentJSON === 'function' ? q.toStudentJSON() : q
      );

      const quizData = quiz.toObject();
      quizData.questions = studentQuestions;
      return res.status(200).json({ quiz: quizData });
    }

    res.status(200).json({ quiz });
  } catch (err) {
    next(err);
  }
});

// POST /api/quizzes (Teacher only)
router.post(
  '/',
  requireAuth,
  requireRole('teacher'),
  validate(createQuizSchema),
  async (req, res, next) => {
    try {
      const quiz = await Quiz.create({
        ...req.body,
        createdBy: req.user._id,
      });

      res.status(201).json({ quiz });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/quizzes/:id (Teacher only + ownership)
router.patch(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  validate(updateQuizSchema),
  async (req, res, next) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Quiz not found' },
        });
      }

      if (quiz.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You are not the creator of this quiz' },
        });
      }

      Object.assign(quiz, req.body);
      await quiz.save();

      res.status(200).json({ quiz });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/quizzes/:id/publish (Teacher only + ownership)
router.post('/:id/publish', requireAuth, requireRole('teacher'), async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quiz not found' },
      });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You are not the creator of this quiz' },
      });
    }

    quiz.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : !quiz.isPublished;
    await quiz.save();

    res.status(200).json({ quiz });
  } catch (err) {
    next(err);
  }
});

// POST /api/quizzes/:id/questions (Teacher adds single question)
router.post(
  '/:id/questions',
  requireAuth,
  requireRole('teacher'),
  validate(questionSchema),
  async (req, res, next) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Quiz not found' },
        });
      }

      if (quiz.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You are not the creator of this quiz' },
        });
      }

      const marks = req.body.marks || quiz.marksPerQuestion || 1;
      const question = await Question.create({
        ...req.body,
        marks,
        quiz: quiz._id,
      });

      quiz.questions.push(question._id);
      quiz.totalMarks = (quiz.totalMarks || 0) + marks;
      await quiz.save();

      res.status(201).json({ question, quiz });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/quizzes/:id/questions/import (Bulk import JSON / CSV)
router.post(
  '/:id/questions/import',
  requireAuth,
  requireRole('teacher'),
  async (req, res, next) => {
    try {
      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Quiz not found' },
        });
      }

      if (quiz.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You are not the creator of this quiz' },
        });
      }

      let rawQuestions = [];
      if (Array.isArray(req.body.questions)) {
        rawQuestions = req.body.questions;
      } else if (typeof req.body.csvData === 'string') {
        rawQuestions = parseQuestionsFromCSV(req.body.csvData, quiz.marksPerQuestion);
      } else {
        return res.status(400).json({
          error: {
            code: 'INVALID_IMPORT_PAYLOAD',
            message: 'Provide either a JSON "questions" array or "csvData" string',
          },
        });
      }

      if (rawQuestions.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_QUESTIONS',
            message: 'No valid questions were found in import payload',
          },
        });
      }

      const result = await importQuestionsIntoQuiz(quiz._id, rawQuestions);

      res.status(200).json({
        success: true,
        importedCount: result.count,
        totalMarks: result.quiz.totalMarks,
        totalQuestions: result.quiz.questions.length,
      });
    } catch (err) {
      return res.status(400).json({
        error: { code: 'IMPORT_ERROR', message: err.message },
      });
    }
  }
);

// POST /api/quizzes/:id/attempts (Start new or retake attempt)
router.post('/:id/attempts', requireAuth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('questions');
    if (!quiz) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Quiz not found' },
      });
    }

    if (!quiz.isPublished && req.user.role === 'student') {
      return res.status(403).json({
        error: { code: 'QUIZ_NOT_PUBLISHED', message: 'This quiz is not currently open for attempts' },
      });
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({
        error: { code: 'EMPTY_QUIZ', message: 'This quiz has no questions available' },
      });
    }

    const studentId = req.user._id;

    // Guard: Enforce at most ONE live in-progress attempt per quiz at a time
    const liveAttempt = await Attempt.findOne({
      quiz: quiz._id,
      student: studentId,
      status: 'in-progress',
    });

    const now = new Date();

    if (liveAttempt) {
      // Check if deadline has passed: if yes, finalize-on-access immediately
      if (now > liveAttempt.deadline) {
        await finalizeAttempt(liveAttempt, 'auto-submitted');
      } else {
        // Active attempt is still running -> 409 Conflict
        return res.status(409).json({
          error: {
            code: 'ATTEMPT_IN_PROGRESS',
            message: 'You already have an active attempt in progress for this quiz.',
            attemptId: liveAttempt._id,
            remainingSeconds: Math.max(0, Math.floor((liveAttempt.deadline.getTime() - now.getTime()) / 1000)),
          },
        });
      }
    }

    // Check past attempts for retake limits
    const pastAttempts = await Attempt.countDocuments({
      quiz: quiz._id,
      student: studentId,
    });

    if (pastAttempts > 0 && !quiz.allowRetakes) {
      return res.status(403).json({
        error: { code: 'RETAKES_FORBIDDEN', message: 'Retakes are not permitted for this quiz' },
      });
    }

    if (quiz.maxAttempts > 0 && pastAttempts >= quiz.maxAttempts) {
      return res.status(403).json({
        error: {
          code: 'MAX_ATTEMPTS_REACHED',
          message: `Maximum allowed attempts (${quiz.maxAttempts}) has been reached`,
        },
      });
    }

    const attemptNumber = pastAttempts + 1;
    const startedAt = now;
    const deadline = new Date(startedAt.getTime() + quiz.durationMinutes * 60 * 1000);

    // Initial answers array with palette state
    const initialAnswers = quiz.questions.map((q, idx) => ({
      question: q._id,
      response: null,
      markedForReview: false,
      visited: idx === 0, // mark first question as visited
      timeSpentMs: 0,
    }));

    const attempt = await Attempt.create({
      quiz: quiz._id,
      student: studentId,
      attemptNumber,
      startedAt,
      deadline,
      status: 'in-progress',
      answers: initialAnswers,
    });

    // Strip answers and explanations from questions for student
    const studentQuestions = quiz.questions.map((q) =>
      typeof q.toStudentJSON === 'function' ? q.toStudentJSON() : q
    );

    res.status(201).json({
      attempt,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        durationMinutes: quiz.durationMinutes,
        totalMarks: quiz.totalMarks,
        questions: studentQuestions,
      },
      serverTime: now.toISOString(),
      deadline: deadline.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id/attempts/me (Student attempt history for this quiz)
router.get('/:id/attempts/me', requireAuth, async (req, res, next) => {
  try {
    const attempts = await Attempt.find({
      quiz: req.params.id,
      student: req.user._id,
    }).sort({ attemptNumber: -1 });

    // Finalize any expired in-progress attempt found in history
    const now = new Date();
    for (const att of attempts) {
      if (att.status === 'in-progress' && now > att.deadline) {
        await finalizeAttempt(att, 'auto-submitted');
      }
    }

    res.status(200).json({ attempts });
  } catch (err) {
    next(err);
  }
});

// POST /api/quizzes/seed - One-click seed endpoint for Vercel/production initialization
router.post('/seed', async (req, res, next) => {
  try {
    const cronSecret = req.headers['x-cron-secret'] || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);
    const isCronAuthorized = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
    const existingCount = await Question.countDocuments();

    // Auto-allow if database is completely unseeded, or if authorized with CRON_SECRET or teacher account
    if (existingCount > 0 && !isCronAuthorized) {
      return requireAuth(req, res, () => {
        requireRole('teacher')(req, res, async () => {
          const { runSeed } = await import('../seed/seedRunner.js');
          const result = await runSeed();
          return res.status(200).json({
            message: `Database successfully seeded with ${result.questionsCount} questions`,
            quizId: result.quiz._id,
            questionsCount: result.questionsCount,
          });
        });
      });
    }

    const { runSeed } = await import('../seed/seedRunner.js');
    const result = await runSeed();
    return res.status(200).json({
      message: `Database successfully seeded with ${result.questionsCount} questions`,
      quizId: result.quiz._id,
      questionsCount: result.questionsCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;


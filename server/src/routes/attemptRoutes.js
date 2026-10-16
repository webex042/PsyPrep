import express from 'express';
import { Attempt } from '../models/Attempt.js';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { saveAnswerSchema } from '../validation/schemas.js';
import { finalizeAttempt, gradeAttempt } from '../services/scoringService.js';

const router = express.Router();

// Helper to verify cron secret for Vercel Cron Maintenance
function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET || 'psyprep_cron_super_secret_token_12345';
  const provided =
    req.headers['x-cron-secret'] ||
    req.headers.authorization?.replace('Bearer ', '') ||
    req.query.secret;

  if (provided !== secret) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED_CRON', message: 'Invalid or missing cron secret' },
    });
  }
  next();
}

// POST /api/attempts/finalize-expired or GET (Vercel Cron Maintenance Endpoint)
router.all('/finalize-expired', requireCronSecret, async (req, res, next) => {
  try {
    const now = new Date();
    const expiredAttempts = await Attempt.find({
      status: 'in-progress',
      deadline: { $lt: now },
    });

    let finalizedCount = 0;
    for (const attempt of expiredAttempts) {
      await finalizeAttempt(attempt, 'auto-submitted');
      finalizedCount++;
    }

    res.status(200).json({
      success: true,
      finalizedCount,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/attempts/:id (Rehydrate attempt / resume after refresh)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('quiz')
      .populate('answers.question');

    if (!attempt) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Attempt not found' },
      });
    }

    // Ownership check
    const isOwner = attempt.student.toString() === req.user._id.toString();
    const isTeacher = req.user.role === 'teacher';
    if (!isOwner && !isTeacher) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have access to this attempt' },
      });
    }

    // Finalize-on-access: if deadline passed, finalize immediately
    const now = new Date();
    if (attempt.status === 'in-progress' && now > attempt.deadline) {
      await finalizeAttempt(attempt, 'auto-submitted');
    }

    // Load full quiz questions (stripped for in-progress student view)
    const quiz = await Quiz.findById(attempt.quiz._id).populate('questions');
    let questionsData = [];

    if (attempt.status === 'in-progress') {
      questionsData = quiz.questions.map((q) =>
        typeof q.toStudentJSON === 'function' ? q.toStudentJSON() : q
      );
    } else {
      // If already finalized, include answers for review
      questionsData = quiz.questions;
    }

    res.status(200).json({
      attempt,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        durationMinutes: quiz.durationMinutes,
        totalMarks: quiz.totalMarks,
        questions: questionsData,
      },
      serverTime: new Date().toISOString(),
      remainingSeconds:
        attempt.status === 'in-progress'
          ? Math.max(0, Math.floor((attempt.deadline.getTime() - Date.now()) / 1000))
          : 0,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/attempts/:id/answers (Autosave answer + palette state)
router.patch('/:id/answers', requireAuth, validate(saveAnswerSchema), async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Attempt not found' },
      });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not own this attempt' },
      });
    }

    // Finalize-on-access: if deadline passed, reject answer and lock
    const now = new Date();
    if (now > attempt.deadline || attempt.status !== 'in-progress') {
      if (attempt.status === 'in-progress') {
        await finalizeAttempt(attempt, 'auto-submitted');
      }
      return res.status(403).json({
        error: {
          code: 'DEADLINE_EXCEEDED',
          message: 'The deadline for this quiz has expired. Attempt has been finalized.',
        },
        status: attempt.status,
      });
    }

    const { questionId, response, markedForReview, visited, timeSpentMs } = req.body;

    // Find and update matching answer record in attempt
    let answerRecord = attempt.answers.find(
      (a) => a.question.toString() === questionId
    );

    if (answerRecord) {
      if (response !== undefined) answerRecord.response = response;
      if (markedForReview !== undefined) answerRecord.markedForReview = markedForReview;
      if (visited !== undefined) answerRecord.visited = visited;
      if (timeSpentMs !== undefined) answerRecord.timeSpentMs = (answerRecord.timeSpentMs || 0) + timeSpentMs;
    } else {
      attempt.answers.push({
        question: questionId,
        response: response ?? null,
        markedForReview: markedForReview ?? false,
        visited: visited ?? true,
        timeSpentMs: timeSpentMs ?? 0,
      });
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      savedAt: new Date().toISOString(),
      questionId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/attempts/:id/submit (Manual submit)
router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Attempt not found' },
      });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not own this attempt' },
      });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        error: {
          code: 'ATTEMPT_ALREADY_FINALIZED',
          message: `Attempt is already finalized with status: ${attempt.status}`,
        },
        attempt,
      });
    }

    const now = new Date();
    const finalStatus = now > attempt.deadline ? 'auto-submitted' : 'submitted';
    const finalized = await finalizeAttempt(attempt, finalStatus);

    res.status(200).json({
      success: true,
      attempt: finalized,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/attempts/:id/result (Centerpiece 5.2: Immediate result & full review with solutions)
router.get('/:id/result', requireAuth, async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('quiz')
      .populate('answers.question');

    if (!attempt) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Attempt not found' },
      });
    }

    const isOwner = attempt.student.toString() === req.user._id.toString();
    const isTeacher = req.user.role === 'teacher';
    if (!isOwner && !isTeacher) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view these results' },
      });
    }

    // Lazy finalization if accessed post-deadline while still in-progress
    if (attempt.status === 'in-progress') {
      const now = new Date();
      if (now > attempt.deadline) {
        await finalizeAttempt(attempt, 'auto-submitted');
      } else {
        return res.status(400).json({
          error: {
            code: 'ATTEMPT_NOT_FINALIZED',
            message: 'Results are available only after the attempt has been submitted',
          },
        });
      }
    }

    const quiz = await Quiz.findById(attempt.quiz._id).populate('questions');

    // Build question-by-question review items with solution & explanation
    const answerMap = new Map();
    for (const a of attempt.answers || []) {
      answerMap.set(a.question?._id ? a.question._id.toString() : a.question.toString(), a);
    }

    const questionsReview = quiz.questions.map((q) => {
      const record = answerMap.get(q._id.toString());
      const studentResp = record ? record.response : null;
      const isCorrect =
        studentResp !== null &&
        studentResp !== undefined &&
        String(studentResp).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();
      const isUnattempted = studentResp === null || studentResp === undefined || studentResp === '';

      return {
        _id: q._id,
        stem: q.stem,
        options: q.options,
        correctAnswer: q.correctAnswer,
        studentResponse: studentResp,
        isCorrect,
        isUnattempted,
        marksAwarded: isCorrect ? (q.marks || 1) : 0,
        maxMarks: q.marks || 1,
        explanation: q.explanation || '', // clean empty string when not provided
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        timeSpentMs: record?.timeSpentMs || 0,
      };
    });

    const totalTimeSpentMs = (attempt.answers || []).reduce(
      (sum, a) => sum + (a.timeSpentMs || 0),
      0
    );

    res.status(200).json({
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt || attempt.finalizedAt,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        correctCount: attempt.correctCount,
        incorrectCount: attempt.incorrectCount,
        unattemptedCount: attempt.unattemptedCount,
        markedCount: attempt.markedCount,
        totalTimeSpentMs,
      },
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        durationMinutes: quiz.durationMinutes,
        allowRetakes: quiz.allowRetakes,
      },
      questionsReview,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

import express from 'express';
import { Question } from '../models/Question.js';
import { Quiz } from '../models/Quiz.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateQuestionSchema } from '../validation/schemas.js';

const router = express.Router();

// PATCH /api/questions/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('teacher'),
  validate(updateQuestionSchema),
  async (req, res, next) => {
    try {
      const question = await Question.findById(req.params.id);
      if (!question) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Question not found' },
        });
      }

      // Check quiz ownership if question is associated with a quiz
      if (question.quiz) {
        const quiz = await Quiz.findById(question.quiz);
        if (quiz && quiz.createdBy.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'You do not own the quiz containing this question' },
          });
        }
      }

      const oldMarks = question.marks || 1;
      Object.assign(question, req.body);
      await question.save();

      // Recalculate quiz total marks if marks changed
      if (req.body.marks !== undefined && question.quiz) {
        const quiz = await Quiz.findById(question.quiz);
        if (quiz) {
          quiz.totalMarks = (quiz.totalMarks || 0) - oldMarks + question.marks;
          await quiz.save();
        }
      }

      res.status(200).json({ question });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/questions/:id
router.delete('/:id', requireAuth, requireRole('teacher'), async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Question not found' },
      });
    }

    if (question.quiz) {
      const quiz = await Quiz.findById(question.quiz);
      if (quiz && quiz.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You do not own the quiz containing this question' },
        });
      }

      if (quiz) {
        quiz.questions = quiz.questions.filter((qId) => qId.toString() !== question._id.toString());
        quiz.totalMarks = Math.max(0, (quiz.totalMarks || 0) - (question.marks || 1));
        await quiz.save();
      }
    }

    await Question.findByIdAndDelete(question._id);

    res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

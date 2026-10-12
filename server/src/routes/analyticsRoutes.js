import express from 'express';
import { Attempt } from '../models/Attempt.js';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/students/me/analytics (Student trends, best vs latest, topic performance)
router.get('/students/me/analytics', requireAuth, async (req, res, next) => {
  try {
    const studentId = req.user._id;

    // Fetch all finalized attempts by this student
    const attempts = await Attempt.find({
      student: studentId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('quiz', 'title subject totalMarks durationMinutes')
      .populate('answers.question', 'stem subject topic difficulty marks correctAnswer')
      .sort({ createdAt: 1 });

    if (attempts.length === 0) {
      return res.status(200).json({
        totalAttempts: 0,
        quizzesTaken: 0,
        overallAccuracy: 0,
        quizPerformances: [],
        scoreTrend: [],
        topicBreakdown: [],
        strongestTopics: [],
        weakestTopics: [],
      });
    }

    // 1. Group by Quiz to find Best vs Latest
    const quizMap = new Map();
    const scoreTrend = [];

    let totalCorrect = 0;
    let totalAnswered = 0;
    const topicStats = new Map(); // topic => { total, correct, subject }

    attempts.forEach((att, idx) => {
      const qz = att.quiz;
      if (!qz) return;

      const qzId = qz._id.toString();
      const currentEntry = quizMap.get(qzId) || {
        quizId: qzId,
        title: qz.title,
        subject: qz.subject,
        attemptsCount: 0,
        bestScore: 0,
        bestPercentage: 0,
        latestScore: 0,
        latestPercentage: 0,
        latestDate: att.createdAt,
        history: [],
      };

      currentEntry.attemptsCount++;
      currentEntry.latestScore = att.score;
      currentEntry.latestPercentage = att.percentage;
      currentEntry.latestDate = att.createdAt;

      if (att.percentage > currentEntry.bestPercentage) {
        currentEntry.bestScore = att.score;
        currentEntry.bestPercentage = att.percentage;
      }

      currentEntry.history.push({
        attemptNumber: att.attemptNumber,
        score: att.score,
        maxScore: att.maxScore,
        percentage: att.percentage,
        date: att.createdAt,
      });

      quizMap.set(qzId, currentEntry);

      scoreTrend.push({
        attemptIndex: idx + 1,
        quizTitle: qz.title,
        attemptNumber: att.attemptNumber,
        score: att.score,
        maxScore: att.maxScore,
        percentage: att.percentage,
        date: att.createdAt,
      });

      // Topic & Accuracy breakdown
      (att.answers || []).forEach((a) => {
        const q = a.question;
        if (!q) return;

        const topicName = q.topic || 'General';
        const isAnswered = a.response !== null && a.response !== undefined && a.response !== '';
        if (isAnswered) {
          totalAnswered++;
          const isRight =
            String(a.response).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();
          if (isRight) totalCorrect++;

          const existing = topicStats.get(topicName) || {
            topic: topicName,
            subject: q.subject || 'General',
            total: 0,
            correct: 0,
          };
          existing.total++;
          if (isRight) existing.correct++;
          topicStats.set(topicName, existing);
        }
      });
    });

    const overallAccuracy =
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 1000) / 10 : 0;

    const topicBreakdown = Array.from(topicStats.values()).map((t) => ({
      ...t,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
    }));

    // Strongest & Weakest topics (sorted by accuracy)
    const sortedTopics = [...topicBreakdown].sort((a, b) => b.accuracy - a.accuracy);
    const strongestTopics = sortedTopics.slice(0, 3);
    const weakestTopics = [...sortedTopics].reverse().slice(0, 3);

    res.status(200).json({
      totalAttempts: attempts.length,
      quizzesTaken: quizMap.size,
      overallAccuracy,
      quizPerformances: Array.from(quizMap.values()),
      scoreTrend,
      topicBreakdown,
      strongestTopics,
      weakestTopics,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/quizzes/:id/analytics (Teacher aggregate analytics)
router.get('/quizzes/:id/analytics', requireAuth, requireRole('teacher'), async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('questions');
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

    const attempts = await Attempt.find({
      quiz: quiz._id,
      status: { $in: ['submitted', 'auto-submitted'] },
    }).populate('student', 'name email');

    if (attempts.length === 0) {
      return res.status(200).json({
        quizId: quiz._id,
        title: quiz.title,
        totalAttempts: 0,
        uniqueStudents: 0,
        averageScore: 0,
        medianScore: 0,
        highestScore: 0,
        lowestScore: 0,
        histogram: [
          { range: '0-20%', count: 0 },
          { range: '21-40%', count: 0 },
          { range: '41-60%', count: 0 },
          { range: '61-80%', count: 0 },
          { range: '81-100%', count: 0 },
        ],
        mostMissedQuestions: [],
      });
    }

    const scores = attempts.map((a) => a.score || 0).sort((a, b) => a - b);
    const percentages = attempts.map((a) => a.percentage || 0);

    const sum = scores.reduce((acc, s) => acc + s, 0);
    const averageScore = Math.round((sum / scores.length) * 10) / 10;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Median
    const mid = Math.floor(scores.length / 2);
    const medianScore =
      scores.length % 2 !== 0 ? scores[mid] : Math.round(((scores[mid - 1] + scores[mid]) / 2) * 10) / 10;

    // Unique students
    const uniqueStudents = new Set(attempts.map((a) => a.student?._id?.toString())).size;

    // Score distribution histogram
    const histogram = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 },
    ];

    percentages.forEach((pct) => {
      if (pct <= 20) histogram[0].count++;
      else if (pct <= 40) histogram[1].count++;
      else if (pct <= 60) histogram[2].count++;
      else if (pct <= 80) histogram[3].count++;
      else histogram[4].count++;
    });

    // Most missed questions
    const questionMisses = new Map();
    quiz.questions.forEach((q) => {
      questionMisses.set(q._id.toString(), {
        questionId: q._id,
        stem: q.stem,
        correctAnswer: q.correctAnswer,
        incorrectAttempts: 0,
        totalAttempts: attempts.length,
      });
    });

    attempts.forEach((att) => {
      (att.answers || []).forEach((a) => {
        const qIdStr = a.question?.toString();
        const stat = questionMisses.get(qIdStr);
        if (stat) {
          const isCorrect =
            a.response &&
            String(a.response).trim().toUpperCase() ===
              String(stat.correctAnswer).trim().toUpperCase();
          if (!isCorrect) {
            stat.incorrectAttempts++;
          }
        }
      });
    });

    const mostMissedQuestions = Array.from(questionMisses.values())
      .map((q) => ({
        ...q,
        missRate: Math.round((q.incorrectAttempts / q.totalAttempts) * 100),
      }))
      .sort((a, b) => b.missRate - a.missRate)
      .slice(0, 5);

    res.status(200).json({
      quizId: quiz._id,
      title: quiz.title,
      totalAttempts: attempts.length,
      uniqueStudents,
      averageScore,
      medianScore,
      highestScore,
      lowestScore,
      histogram,
      mostMissedQuestions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

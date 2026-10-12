import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';
import { Quiz } from '../src/models/Quiz.js';
import { Question } from '../src/models/Question.js';
import { Attempt } from '../src/models/Attempt.js';
import { evaluateAnswer } from '../src/services/scoringService.js';

describe('Phase 2 & Phase 3: Test Engine, Scoring, Retakes, Serverless Auto-Submit & Analytics', () => {
  let studentToken;
  let teacherToken;
  let quizId;
  let questionA;
  let questionB;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // 1. Create Teacher and Quiz
    const teacherRes = await request(app).post('/api/auth/register').send({
      name: 'Teacher One',
      email: 'teacher@test.edu',
      password: 'password123',
      role: 'teacher',
    });
    teacherToken = teacherRes.body.accessToken;

    const quizRes = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Timed Psych Assessment',
        durationMinutes: 10,
        marksPerQuestion: 2,
        isPublished: true,
      });
    quizId = quizRes.body.quiz._id;

    // 2. Add 2 Questions
    const q1Res = await request(app)
      .post(`/api/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        stem: 'What is the powerhouse of the cell?',
        options: [
          { id: 'A', text: 'Mitochondria' },
          { id: 'B', text: 'Nucleus' },
        ],
        correctAnswer: 'A',
        marks: 2,
        subject: 'Biology',
        topic: 'Cellular',
      });
    questionA = q1Res.body.question;

    const q2Res = await request(app)
      .post(`/api/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        stem: 'What is 2 + 2?',
        options: [
          { id: 'A', text: '3' },
          { id: 'B', text: '4' },
        ],
        correctAnswer: 'B',
        marks: 2,
        subject: 'Math',
        topic: 'Arithmetic',
      });
    questionB = q2Res.body.question;

    // 3. Register Student
    const studentRes = await request(app).post('/api/auth/register').send({
      name: 'Student One',
      email: 'student@test.edu',
      password: 'password123',
      role: 'student',
    });
    studentToken = studentRes.body.accessToken;
  });

  describe('Unit Test: evaluateAnswer & Strict No-Negative-Marking', () => {
    it('awards full marks for correct answer, and strictly 0 for wrong or unattempted', () => {
      const q = { type: 'single', correctAnswer: 'A', marks: 5 };

      // Correct
      expect(evaluateAnswer(q, 'A')).toEqual({
        isCorrect: true,
        isUnattempted: false,
        marksAwarded: 5,
      });

      // Wrong answer -> 0 marks (no negative marking)
      expect(evaluateAnswer(q, 'B')).toEqual({
        isCorrect: false,
        isUnattempted: false,
        marksAwarded: 0,
      });

      // Unattempted (null) -> 0 marks
      expect(evaluateAnswer(q, null)).toEqual({
        isCorrect: false,
        isUnattempted: true,
        marksAwarded: 0,
      });

      // Unattempted (empty string) -> 0 marks
      expect(evaluateAnswer(q, '')).toEqual({
        isCorrect: false,
        isUnattempted: true,
        marksAwarded: 0,
      });
    });
  });

  describe('Engine: Start, 409 Conflict, Autosave, Submit & Retakes', () => {
    it('starts an attempt, enforces 409 when one is live, autosaves, and submits', async () => {
      // 1. Start attempt 1
      const startRes = await request(app)
        .post(`/api/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(startRes.status).toBe(201);
      const attempt1 = startRes.body.attempt;
      expect(attempt1.attemptNumber).toBe(1);
      expect(attempt1.status).toBe('in-progress');

      // 2. Starting a second attempt while first is live returns 409 Conflict!
      const conflictRes = await request(app)
        .post(`/api/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe('ATTEMPT_IN_PROGRESS');

      // 3. Autosave answer for Question A (correct: "A")
      const saveRes = await request(app)
        .patch(`/api/attempts/${attempt1._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          questionId: questionA._id,
          response: 'A',
          markedForReview: false,
          visited: true,
          timeSpentMs: 4500,
        });
      expect(saveRes.status).toBe(200);
      expect(saveRes.body.success).toBe(true);

      // 4. Rehydrate attempt (GET /api/attempts/:id) mid-test restores answers and remaining time
      const rehydrateRes = await request(app)
        .get(`/api/attempts/${attempt1._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(rehydrateRes.status).toBe(200);
      expect(rehydrateRes.body.remainingSeconds).toBeGreaterThan(0);
      const savedAnsA = rehydrateRes.body.attempt.answers.find(
        (a) => a.question._id === questionA._id
      );
      expect(savedAnsA.response).toBe('A');

      // 5. Submit attempt manually
      const submitRes = await request(app)
        .post(`/api/attempts/${attempt1._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.attempt.status).toBe('submitted');
      expect(submitRes.body.attempt.score).toBe(2); // Q1 right (2 marks), Q2 unattempted (0 marks)
      expect(submitRes.body.attempt.maxScore).toBe(4);
      expect(submitRes.body.attempt.percentage).toBe(50);
      expect(submitRes.body.attempt.correctCount).toBe(1);
      expect(submitRes.body.attempt.unattemptedCount).toBe(1);

      // 6. Submitting a locked attempt again fails
      const duplicateSubmit = await request(app)
        .post(`/api/attempts/${attempt1._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(duplicateSubmit.status).toBe(400);

      // 7. Retake: now that attempt 1 is submitted, starting a new attempt succeeds (attemptNumber = 2)
      const retakeRes = await request(app)
        .post(`/api/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(retakeRes.status).toBe(201);
      expect(retakeRes.body.attempt.attemptNumber).toBe(2);
      expect(retakeRes.body.attempt.status).toBe('in-progress');
    });

    it('rejects answer autosaves after deadline and finalizes via finalize-on-access and cron', async () => {
      // 1. Start attempt
      const startRes = await request(app)
        .post(`/api/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);
      const attempt = startRes.body.attempt;

      // 2. Answer question A
      await request(app)
        .patch(`/api/attempts/${attempt._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          questionId: questionA._id,
          response: 'A',
        });

      // 3. Manually simulate expired deadline in the database
      const pastDeadline = new Date(Date.now() - 60 * 1000); // 1 minute in the past
      await Attempt.findByIdAndUpdate(attempt._id, { deadline: pastDeadline });

      // 4. Answer write after deadline is rejected with 403 DEADLINE_EXCEEDED!
      const lateSaveRes = await request(app)
        .patch(`/api/attempts/${attempt._id}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          questionId: questionB._id,
          response: 'B',
        });
      expect(lateSaveRes.status).toBe(403);
      expect(lateSaveRes.body.error.code).toBe('DEADLINE_EXCEEDED');

      // 5. Finalize-on-access: Reading the attempt lazily finalizes it as auto-submitted
      const getRes = await request(app)
        .get(`/api/attempts/${attempt._id}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.attempt.status).toBe('auto-submitted');
      expect(getRes.body.attempt.score).toBe(2); // Only Q1 scored, late Q2 was rejected

      // 6. Test Cron Maintenance Endpoint with secret token
      // Create another expired attempt
      const pastAttempt2 = await Attempt.create({
        quiz: quizId,
        student: (await Attempt.findById(attempt._id)).student,
        attemptNumber: 2,
        startedAt: new Date(Date.now() - 120000),
        deadline: new Date(Date.now() - 60000),
        status: 'in-progress',
        answers: [{ question: questionA._id, response: 'A' }],
      });

      const cronRes = await request(app)
        .post('/api/attempts/finalize-expired')
        .set('x-cron-secret', process.env.CRON_SECRET || 'psyprep_cron_super_secret_token_12345');
      expect(cronRes.status).toBe(200);
      expect(cronRes.body.finalizedCount).toBeGreaterThanOrEqual(1);

      const refreshed = await Attempt.findById(pastAttempt2._id);
      expect(refreshed.status).toBe('auto-submitted');
      expect(refreshed.score).toBe(2);
    });

    it('returns immediate result and analytics with solutions for owner only', async () => {
      // 1. Start and submit with both correct
      const startRes = await request(app)
        .post(`/api/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${studentToken}`);
      const attemptId = startRes.body.attempt._id;

      await request(app)
        .patch(`/api/attempts/${attemptId}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ questionId: questionA._id, response: 'A', timeSpentMs: 3000 });

      await request(app)
        .patch(`/api/attempts/${attemptId}/answers`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ questionId: questionB._id, response: 'B', timeSpentMs: 4000 });

      await request(app)
        .post(`/api/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);

      // 2. GET /api/attempts/:id/result returns solutions and questionsReview
      const resultRes = await request(app)
        .get(`/api/attempts/${attemptId}/result`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(resultRes.status).toBe(200);
      expect(resultRes.body.attempt.score).toBe(4);
      expect(resultRes.body.attempt.percentage).toBe(100);
      expect(resultRes.body.questionsReview.length).toBe(2);
      expect(resultRes.body.questionsReview[0].correctAnswer).toBe('A');

      // 3. Student analytics (GET /api/students/me/analytics)
      const analyticsRes = await request(app)
        .get('/api/students/me/analytics')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body.totalAttempts).toBe(1);
      expect(analyticsRes.body.overallAccuracy).toBe(100);
      expect(analyticsRes.body.quizPerformances[0].bestPercentage).toBe(100);

      // 4. Teacher aggregate analytics (GET /api/quizzes/:id/analytics)
      const teacherAnalyticsRes = await request(app)
        .get(`/api/quizzes/${quizId}/analytics`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(teacherAnalyticsRes.status).toBe(200);
      expect(teacherAnalyticsRes.body.totalAttempts).toBe(1);
      expect(teacherAnalyticsRes.body.averageScore).toBe(4);
      expect(teacherAnalyticsRes.body.histogram).toBeDefined();
    });
  });
});

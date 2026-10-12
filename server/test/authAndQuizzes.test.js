import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';
import { runSeed } from '../src/seed/seedRunner.js';

describe('Phase 1: Auth, Quizzes, Questions & Seeding', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('registers a student and a teacher with role enforcement', async () => {
    // Register Student
    const studentRes = await request(app).post('/api/auth/register').send({
      name: 'Alice Student',
      email: 'alice@test.edu',
      password: 'password123',
      role: 'student',
    });
    expect(studentRes.status).toBe(201);
    expect(studentRes.body.user.role).toBe('student');
    expect(studentRes.body.accessToken).toBeDefined();

    // Register Teacher
    const teacherRes = await request(app).post('/api/auth/register').send({
      name: 'Prof. Xavier',
      email: 'xavier@test.edu',
      password: 'password123',
      role: 'teacher',
    });
    expect(teacherRes.status).toBe(201);
    expect(teacherRes.body.user.role).toBe('teacher');
    expect(teacherRes.body.accessToken).toBeDefined();

    // Student cannot create quiz (403 Forbidden)
    const forbiddenRes = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${studentRes.body.accessToken}`)
      .send({
        title: 'Unauthorized Quiz',
        durationMinutes: 30,
      });
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

    // Teacher can create quiz
    const quizRes = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${teacherRes.body.accessToken}`)
      .send({
        title: 'Cognitive Psychology Midterm',
        durationMinutes: 45,
        marksPerQuestion: 2,
      });
    expect(quizRes.status).toBe(201);
    expect(quizRes.body.quiz.title).toBe('Cognitive Psychology Midterm');
  });

  it('supports bulk import of questions via JSON and CSV', async () => {
    // 1. Create Teacher & Quiz
    const teacherRes = await request(app).post('/api/auth/register').send({
      name: 'Prof. McGonagall',
      email: 'mcgonagall@test.edu',
      password: 'password123',
      role: 'teacher',
    });
    const token = teacherRes.body.accessToken;

    const quizRes = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Transfiguration 101',
        durationMinutes: 20,
      });
    const quizId = quizRes.body.quiz._id;

    // 2. Bulk import via JSON
    const jsonImportRes = await request(app)
      .post(`/api/quizzes/${quizId}/questions/import`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        questions: [
          {
            stem: 'What is the speed of light?',
            options: [
              { id: 'A', text: '300,000 km/s' },
              { id: 'B', text: '150,000 km/s' },
            ],
            correctAnswer: 'A',
            subject: 'Physics',
            topic: 'Relativity',
            difficulty: 'easy',
          },
        ],
      });
    expect(jsonImportRes.status).toBe(200);
    expect(jsonImportRes.body.importedCount).toBe(1);

    // 3. Bulk import via CSV format
    const csvData = `stem,optionA,optionB,optionC,optionD,correctAnswer,subject,topic,difficulty
"What is H2O?","Water","Helium","Hydrogen","Oxygen","A","Chemistry","Molecules","easy"`;

    const csvImportRes = await request(app)
      .post(`/api/quizzes/${quizId}/questions/import`)
      .set('Authorization', `Bearer ${token}`)
      .send({ csvData });
    expect(csvImportRes.status).toBe(200);
    expect(csvImportRes.body.importedCount).toBe(1);
    expect(csvImportRes.body.totalQuestions).toBe(2);
  });

  it('guarantees that correctAnswer and explanation are stripped for student quiz view', async () => {
    // 1. Seed quiz using seedRunner
    const { teacher, student, quiz } = await runSeed();

    // 2. Teacher login
    const teacherLogin = await request(app).post('/api/auth/login').send({
      email: 'teacher@psyprep.edu',
      password: 'Password123!',
    });
    const teacherToken = teacherLogin.body.accessToken;

    // 3. Student login
    const studentLogin = await request(app).post('/api/auth/login').send({
      email: 'student@psyprep.edu',
      password: 'Password123!',
    });
    const studentToken = studentLogin.body.accessToken;

    // Teacher sees questions with correctAnswer
    const teacherView = await request(app)
      .get(`/api/quizzes/${quiz._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(teacherView.status).toBe(200);
    expect(teacherView.body.quiz.questions[0].correctAnswer).toBeDefined();

    // Student sees questions WITHOUT correctAnswer and WITHOUT explanation
    const studentView = await request(app)
      .get(`/api/quizzes/${quiz._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentView.status).toBe(200);
    const q0 = studentView.body.quiz.questions[0];
    expect(q0.correctAnswer).toBeUndefined();
    expect(q0.explanation).toBeUndefined();
    expect(q0.stem).toBeDefined();
    expect(q0.options).toBeDefined();
  });
});

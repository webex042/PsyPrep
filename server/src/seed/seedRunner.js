import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../db.js';
import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { importQuestionsIntoQuiz } from '../services/importService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, '../../../seed/questions.json');

export async function runSeed(customQuestions) {
  let questionsToSeed = customQuestions;

  if (!questionsToSeed) {
    let filePath = SEED_FILE;
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(process.cwd(), 'seed/questions.json');
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`Seed file not found at ${SEED_FILE} or ${path.resolve(process.cwd(), 'seed/questions.json')}`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    questionsToSeed = JSON.parse(raw);
  }


  console.log(`\n🌱 Seeding database with ${questionsToSeed.length} questions...`);

  // 1. Ensure default Teacher exists
  let teacher = await User.findOne({ email: 'teacher@psyprep.edu' });
  if (!teacher) {
    teacher = await User.create({
      name: 'Dr. Sarah Connor (Teacher)',
      email: 'teacher@psyprep.edu',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'teacher',
    });
    console.log('👤 Created default teacher account: teacher@psyprep.edu');
  }

  // 2. Ensure default Student exists
  let student = await User.findOne({ email: 'student@psyprep.edu' });
  if (!student) {
    student = await User.create({
      name: 'Alex Mercer (Student)',
      email: 'student@psyprep.edu',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'student',
    });
    console.log('👤 Created default student account: student@psyprep.edu');
  }

  // 3. Create or find default Quiz
  let quiz = await Quiz.findOne({ title: 'PsyPrep Grand Comprehensive Mock Test' });
  if (quiz) {
    // Clean old seeded questions for this quiz to keep it pristine
    await Question.deleteMany({ quiz: quiz._id });
    quiz.questions = [];
    quiz.totalMarks = 0;
    await quiz.save();
  } else {
    quiz = await Quiz.create({
      title: 'PsyPrep Grand Comprehensive Mock Test',
      description: 'Comprehensive mock examination covering Psychology, Cognition, Learning Theories, and Digital Pedagogy.',
      subject: 'Psychology & Education',
      createdBy: teacher._id,
      durationMinutes: 30,
      marksPerQuestion: 1,
      totalMarks: 0,
      allowRetakes: true,
      maxAttempts: 0, // unlimited retakes
      isPublished: true,
    });
    console.log('📝 Created master quiz: "PsyPrep Grand Comprehensive Mock Test"');
  }

  // 4. Import the questions
  const importResult = await importQuestionsIntoQuiz(quiz._id, questionsToSeed);

  console.log(`✅ Successfully seeded ${importResult.count} questions into Quiz "${quiz.title}"`);
  console.log(`📊 Quiz ID: ${quiz._id}`);
  console.log(`⏱️ Duration: ${quiz.durationMinutes} minutes | Total Marks: ${importResult.quiz.totalMarks}`);

  return {
    teacher,
    student,
    quiz: importResult.quiz,
    questionsCount: importResult.count,
  };
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('seedRunner.js')) {
  (async () => {
    try {
      await connectDB();
      await runSeed();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    }
  })();
}

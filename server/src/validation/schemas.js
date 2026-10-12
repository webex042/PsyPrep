import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'teacher']).default('student'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createQuizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional().default(''),
  subject: z.string().optional().default('General'),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute'),
  marksPerQuestion: z.number().min(0.5).default(1),
  allowRetakes: z.boolean().default(true),
  maxAttempts: z.number().int().min(0).default(0),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export const updateQuizSchema = createQuizSchema.partial();

export const questionSchema = z.object({
  type: z.enum(['single', 'multiple', 'boolean', 'numeric']).default('single'),
  stem: z.string().min(3, 'Question stem must be at least 3 characters'),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .min(2, 'At least 2 options are required for MCQs'),
  correctAnswer: z.any(),
  marks: z.number().min(0).optional(),
  explanation: z.string().optional().default(''),
  subject: z.string().optional().default('General'),
  topic: z.string().optional().default('General'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

export const updateQuestionSchema = questionSchema.partial();

export const saveAnswerSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  response: z.any().optional(),
  markedForReview: z.boolean().optional(),
  visited: z.boolean().optional(),
  timeSpentMs: z.number().min(0).optional(),
});

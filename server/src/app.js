import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './db.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration (supports local dev across ports and same-origin in production)
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin || process.env.NODE_ENV === 'test') {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serverless DB connection middleware
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV !== 'test' && process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('Database connection error in middleware:', err.message);
    }
  }
  next();
});

// Health check and API root endpoints
app.get(['/api', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'PsyPrep API',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api', analyticsRoutes);

// Global 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.baseUrl}`,
    },
  });
});

// Centralized error handler returning consistent error shape
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred',
      details: err.details || undefined,
    },
  });
});

export default app;

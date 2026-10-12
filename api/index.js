import app from '../server/src/app.js';
import { connectDB } from '../server/src/db.js';

export default async function handler(req, res) {
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('Serverless MongoDB connection error:', err.message);
    }
  }

  return app(req, res);
}


import app from './app.js';
import { connectDB } from './db.js';
import { runSeed } from './seed/seedRunner.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    try {
      await connectDB();
      console.log('✅ Connected to MongoDB');
    } catch (dbErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ Could not connect to configured MongoDB (${dbErr.message}).`);
        console.log('🌱 Starting embedded development MongoDB instance...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        await connectDB(memoryUri);
        console.log(`✅ Connected to embedded MongoDB at ${memoryUri}`);
        console.log('🌱 Auto-seeding 130 questions and default accounts...');
        await runSeed();
      } else {
        throw dbErr;
      }
    }

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 PsyPrep Server listening on port ${PORT}`);
      console.log(`📡 Web Client running on http://localhost:5173`);
      console.log(`👤 Demo Accounts:`);
      console.log(`   - Student: student@psyprep.edu / Password123!`);
      console.log(`   - Teacher: teacher@psyprep.edu / Password123!`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

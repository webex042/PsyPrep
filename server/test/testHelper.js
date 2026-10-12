import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongodInstance = null;

export async function setupTestDB() {
  if (!mongodInstance) {
    mongodInstance = await MongoMemoryServer.create();
  }
  const uri = mongodInstance.getUri();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
}

export async function teardownTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // Keep mongodInstance warm or stop on process exit
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
}

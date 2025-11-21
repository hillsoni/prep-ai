import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { redisClient } from '../config/redis';

let mongoServer: MongoMemoryServer;

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  // Connect to Redis for testing
  await redisClient.connect();
});

// Cleanup after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  await redisClient.disconnect();
});

// Global test timeout
jest.setTimeout(30000);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setUseMemoryFallback } from './memoryDb';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skymarket';

export async function connectDB(): Promise<typeof mongoose | null> {
  try {
    mongoose.set('strictQuery', true);
    // Connect with a fast 3-second timeout so start-up doesn't hang
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    console.log(`[SkyMarket DB] Connected successfully to MongoDB: ${conn.connection.host}`);
    setUseMemoryFallback(false);
    return conn;
  } catch (error) {
    console.error('[SkyMarket DB] Database connection error:', error);
    console.log('[SkyMarket DB] Activating resilient local in-memory/JSON storage engine fallback...');
    setUseMemoryFallback(true);
    return null;
  }
}


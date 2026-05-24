import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectDB() {
  mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));

  await mongoose.connect(ENV.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
  });
  console.log('✅ MongoDB connected');
}

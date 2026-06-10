import mongoose from 'mongoose';
import { validateEnv } from './env';
import { MONGODB_CONFIG } from './constants';

validateEnv();

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set in environment variables');
}

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: MONGODB_CONFIG.MAX_POOL_SIZE,
      serverSelectionTimeoutMS: MONGODB_CONFIG.SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: MONGODB_CONFIG.SOCKET_TIMEOUT_MS,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

declare global {
  var mongoose: {
    conn: mongoose.Mongoose | null;
    promise: Promise<mongoose.Mongoose> | null;
  };
}

export default connectDB;

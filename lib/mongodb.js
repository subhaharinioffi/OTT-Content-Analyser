import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, isFallback: false };
}

// Local persistence fallback path for seamless local operation if Atlas credentials have placeholder
const fallbackDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(fallbackDir)) {
  fs.mkdirSync(fallbackDir, { recursive: true });
}

export async function connectToDatabase() {
  const uri = process.env.DATABASE_URL || '';

  // If already connected to MongoDB, return cached connection
  if (cached.conn && !cached.isFallback) {
    return cached.conn;
  }

  // Check if DATABASE_URL contains placeholder or is empty
  const hasPlaceholder = !uri || uri.includes('<db_password>') || uri.includes('<password>');

  if (hasPlaceholder) {
    console.warn(
      '⚠️ Notice: DATABASE_URL in .env.local contains <db_password> placeholder. Using resilient local store so all operations succeed until your Atlas password is set.'
    );
    cached.isFallback = true;
    return null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log('✅ Connected to MongoDB Atlas successfully.');
      cached.isFallback = false;
      return m;
    }).catch((err) => {
      console.warn('⚠️ MongoDB connection error, switching to resilient datastore:', err.message);
      cached.isFallback = true;
      cached.promise = null;
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.isFallback = true;
    cached.conn = null;
  }

  return cached.conn;
}

export function isDbFallback() {
  return cached.isFallback;
}

// Resilient local store helper functions (so models work seamlessly in both MongoDB and fallback)
export function getLocalCollection(collectionName) {
  const filePath = path.join(fallbackDir, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

export function saveLocalCollection(collectionName, items) {
  const filePath = path.join(fallbackDir, `${collectionName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
}

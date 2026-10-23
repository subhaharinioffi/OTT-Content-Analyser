import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, isFallback: false };
}

// Global in-memory storage so fallback never crashes in read-only serverless environments (Vercel)
let inMemoryStore = global.inMemoryStore;
if (!inMemoryStore) {
  inMemoryStore = global.inMemoryStore = {};
}

// Local persistence fallback path: on Vercel use /tmp/.data, locally use process.cwd()/.data
const fallbackDir = process.env.VERCEL
  ? path.join('/tmp', '.data')
  : path.join(process.cwd(), '.data');

try {
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
} catch (e) {
  // Gracefully ignore directory creation issues on read-only filesystems
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
      '⚠️ Notice: DATABASE_URL in .env.local contains <db_password> placeholder. Using resilient store so all operations succeed until your Atlas password is set.'
    );
    cached.isFallback = true;
    return null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        console.log('✅ Connected to MongoDB Atlas successfully.');
        cached.isFallback = false;
        return m;
      })
      .catch((err) => {
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

// Resilient store helper functions with dual in-memory and disk caching
export function getLocalCollection(collectionName) {
  if (inMemoryStore[collectionName] && inMemoryStore[collectionName].length > 0) {
    return inMemoryStore[collectionName];
  }

  try {
    const filePath = path.join(fallbackDir, `${collectionName}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw || '[]');
      inMemoryStore[collectionName] = data;
      return data;
    }
  } catch (err) {
    // Ignore read errors
  }

  inMemoryStore[collectionName] = inMemoryStore[collectionName] || [];
  return inMemoryStore[collectionName];
}

export function saveLocalCollection(collectionName, items) {
  inMemoryStore[collectionName] = items;
  try {
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    const filePath = path.join(fallbackDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    // Gracefully ignore write errors on read-only environments
  }
}

import mongoose from 'mongoose';
import { connectToDatabase, isDbFallback, getLocalCollection, saveLocalCollection } from '@/lib/mongodb';
import { getCloudUsers, saveUserToCloud } from '@/lib/cloudStorage';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, sparse: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'reviewer', enum: ['reviewer', 'admin', 'creator'] },
    organization: { type: String, default: 'Cinema Compliance Studio' },
  },
  { timestamps: true }
);

const MongooseUser = mongoose.models.User || mongoose.model('User', UserSchema);

export const UserModel = {
  /**
   * Find a user by email, username, or name across MongoDB Atlas, Cloudinary CDN, and local storage
   */
  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.toLowerCase().trim();

    // 1. Try MongoDB Atlas if connected
    await connectToDatabase();
    if (!isDbFallback()) {
      try {
        const u = await MongooseUser.findOne({
          $or: [
            { email: clean },
            { username: clean },
            { name: new RegExp(`^${clean}$`, 'i') },
          ],
        });
        if (u) return u;
      } catch (err) {
        console.warn('Mongoose query warning:', err.message);
      }
    }

    // 2. Query Cloudinary shared cloud users store (shared across ALL Vercel instances worldwide)
    try {
      const cloudUsers = await getCloudUsers();
      if (Array.isArray(cloudUsers)) {
        const cloudMatch = cloudUsers.find((u) => {
          const uEmail = (u.email || '').toLowerCase().trim();
          const uUname = (u.username || '').toLowerCase().trim();
          const uName = (u.name || '').toLowerCase().trim();
          return uEmail === clean || uUname === clean || uName === clean;
        });
        if (cloudMatch) return cloudMatch;
      }
    } catch (e) {
      console.warn('Cloud storage user lookup warning:', e.message);
    }

    // 3. Fallback to local collection
    const localUsers = getLocalCollection('users');
    return (
      localUsers.find((u) => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uUname = (u.username || '').toLowerCase().trim();
        const uName = (u.name || '').toLowerCase().trim();
        return uEmail === clean || uUname === clean || uName === clean;
      }) || null
    );
  },

  async findOne({ email, username }) {
    return this.findByIdentifier(email || username);
  },

  async findById(id) {
    if (!id) return null;
    await connectToDatabase();
    if (!isDbFallback()) {
      try {
        const u = await MongooseUser.findById(id);
        if (u) return u;
      } catch (e) {}
    }

    const cloudUsers = await getCloudUsers();
    const found = cloudUsers.find((u) => (u._id?.toString() || u.id) === id);
    if (found) return found;

    const localUsers = getLocalCollection('users');
    return localUsers.find((u) => (u._id?.toString() || u.id) === id) || null;
  },

  /**
   * Register a new user and persist globally
   */
  async create({ name, username, email, password, role = 'reviewer', organization = 'Cinema Compliance Studio' }) {
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = (username || name.replace(/\s+/g, '_')).toLowerCase().trim();

    await connectToDatabase();
    if (!isDbFallback()) {
      try {
        const created = await MongooseUser.create({
          name: name.trim(),
          username: cleanUsername,
          email: cleanEmail,
          password,
          role,
          organization,
        });
        if (created) return created;
      } catch (err) {
        console.warn('Mongoose create fallback:', err.message);
      }
    }

    // Resilient global creation via Cloudinary & local storage
    const cloudUsers = await getCloudUsers();
    const existing = cloudUsers.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uUname = (u.username || '').toLowerCase().trim();
      return uEmail === cleanEmail || uUname === cleanUsername;
    });

    if (existing) {
      throw new Error('An account with this username or email already exists.');
    }

    const newUser = {
      _id: crypto.randomBytes(12).toString('hex'),
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      role,
      organization,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Cloudinary (instantly accessible across all Vercel micro-containers globally)
    await saveUserToCloud(newUser);

    // Save to local collection
    const localUsers = getLocalCollection('users');
    localUsers.push(newUser);
    saveLocalCollection('users', localUsers);

    return newUser;
  },
};

export default MongooseUser;

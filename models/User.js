import mongoose from 'mongoose';
import { connectToDatabase, isDbFallback, getLocalCollection, saveLocalCollection } from '@/lib/mongodb';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'reviewer', enum: ['reviewer', 'admin', 'creator'] },
    organization: { type: String, default: 'Cinema Compliance Studio' },
  },
  { timestamps: true }
);

const MongooseUser = mongoose.models.User || mongoose.model('User', UserSchema);

export const UserModel = {
  async findOne({ email }) {
    await connectToDatabase();
    if (!isDbFallback()) {
      return await MongooseUser.findOne({ email: email.toLowerCase() });
    }
    const users = getLocalCollection('users');
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findById(id) {
    await connectToDatabase();
    if (!isDbFallback()) {
      return await MongooseUser.findById(id);
    }
    const users = getLocalCollection('users');
    return users.find((u) => u._id === id || u.id === id) || null;
  },

  async create({ name, email, password, role = 'reviewer', organization = 'Cinema Compliance Studio' }) {
    await connectToDatabase();
    if (!isDbFallback()) {
      return await MongooseUser.create({ name, email: email.toLowerCase(), password, role, organization });
    }
    const users = getLocalCollection('users');
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('User already exists');
    }
    const newUser = {
      _id: crypto.randomBytes(12).toString('hex'),
      name,
      email: email.toLowerCase(),
      password,
      role,
      organization,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveLocalCollection('users', users);
    return newUser;
  },
};

export default MongooseUser;

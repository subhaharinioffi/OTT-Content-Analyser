import bcrypt from 'bcryptjs';
import { UserModel } from '@/models/User';

let isSeeded = false;

export async function ensureSeedData() {
  if (isSeeded) return;

  try {
    // Ensure Demo Reviewer User for quick evaluation
    const existingUser = await UserModel.findOne({ email: 'demo.reviewer@cinecomply.io' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('Compliance2026!', 10);
      await UserModel.create({
        name: 'Subhaharini S (Lead Reviewer)',
        email: 'demo.reviewer@cinecomply.io',
        password: hashedPassword,
        role: 'reviewer',
        organization: 'Shortfundly CensorAI Labs',
      });
      console.log('✅ Initialized Shortfundly reviewer credentials.');
    }

    isSeeded = true;
  } catch (err) {
    console.warn('Seed data warning:', err.message);
  }
}

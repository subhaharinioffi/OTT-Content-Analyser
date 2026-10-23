import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserModel } from '@/models/User';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, username, email, password, role, organization } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = (username || name.replace(/\s+/g, '_')).toLowerCase().trim();

    // Check if user already exists
    const existing =
      (await UserModel.findByIdentifier(cleanEmail)) ||
      (await UserModel.findByIdentifier(cleanUsername));

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this username or email already exists.' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and persist across Cloudinary global store
    const newUser = await UserModel.create({
      name,
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'reviewer',
      organization: organization || 'Cinema Compliance Studio',
    });

    return NextResponse.json(
      {
        message: 'Account registered successfully.',
        user: {
          id: newUser._id?.toString() || newUser.id,
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}

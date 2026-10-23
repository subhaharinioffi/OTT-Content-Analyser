import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { UserModel } from '@/models/User';
import { ensureSeedData } from '@/lib/seed';

// Ensure NEXTAUTH_URL and NEXTAUTH_SECRET are always set in any environment (Vercel, local, container)
const isLocalhostUrl =
  !process.env.NEXTAUTH_URL ||
  process.env.NEXTAUTH_URL.includes('localhost') ||
  process.env.NEXTAUTH_URL.includes('127.0.0.1');

if (process.env.VERCEL || process.env.VERCEL_URL || process.env.NODE_ENV === 'production') {
  if (isLocalhostUrl) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    } else {
      process.env.NEXTAUTH_URL = 'https://ott-content-analyser.vercel.app';
    }
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET =
    '29054bdaa9cab6e0f9bba82d85b306fdf99fa2b20672adef2c117c853761ef69';
}

process.env.AUTH_TRUST_HOST = 'true';

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        username: { label: 'Username or Email', type: 'text' },
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = (credentials?.username || credentials?.email || '').trim();
        const password = credentials?.password || '';

        if (!identifier || !password) {
          throw new Error('Please enter both username (or email) and password.');
        }

        try {
          await ensureSeedData();
        } catch (seedErr) {
          console.warn('Seed initialization notice in authorize:', seedErr.message);
        }

        const user = await UserModel.findByIdentifier(identifier);

        if (!user) {
          throw new Error('No account found with this username or email.');
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          throw new Error('Incorrect password. Please verify your credentials.');
        }

        return {
          id: user._id?.toString() || user.id,
          name: user.name,
          username: user.username || user.name.replace(/\s+/g, '_').toLowerCase(),
          email: user.email,
          role: user.role || 'reviewer',
          organization: user.organization || 'Cinema Compliance Studio',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
        token.role = user.role;
        token.organization = user.organization;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username || token.name;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.organization = token.organization;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      let activeBase = baseUrl;
      if (
        activeBase.includes('localhost') &&
        (process.env.VERCEL || process.env.NODE_ENV === 'production')
      ) {
        activeBase = 'https://ott-content-analyser.vercel.app';
      }

      if (url.startsWith('/')) {
        return `${activeBase}${url}`;
      }

      try {
        const parsed = new URL(url);
        if (parsed.origin === activeBase) {
          return url;
        }
      } catch (e) {}

      return activeBase;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    '29054bdaa9cab6e0f9bba82d85b306fdf99fa2b20672adef2c117c853761ef69',
  trustHost: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

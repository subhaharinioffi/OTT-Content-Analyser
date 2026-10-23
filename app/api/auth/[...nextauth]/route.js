import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { UserModel } from '@/models/User';
import { ensureSeedData } from '@/lib/seed';

// Ensure NEXTAUTH_URL and NEXTAUTH_SECRET are always set in any environment (Vercel, local, container)
if (!process.env.NEXTAUTH_URL) {
  if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  } else {
    process.env.NEXTAUTH_URL = 'https://ott-content-analyser.vercel.app';
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
        email: { label: 'Email', type: 'email', placeholder: 'compliance@cinema.io' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password.');
        }

        try {
          await ensureSeedData();
        } catch (seedErr) {
          console.warn('Seed initialization notice in authorize:', seedErr.message);
        }

        const user = await UserModel.findOne({ email: credentials.email });

        if (!user) {
          throw new Error('No account found with this email address.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Incorrect password. Please verify your credentials.');
        }

        return {
          id: user._id?.toString() || user.id,
          name: user.name,
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
        token.role = user.role;
        token.organization = user.organization;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organization = token.organization;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch (e) {}
      return baseUrl;
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

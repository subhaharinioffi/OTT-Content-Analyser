import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret =
  process.env.NEXTAUTH_SECRET ||
  '29054bdaa9cab6e0f9bba82d85b306fdf99fa2b20672adef2c117c853761ef69';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Protect /submit and /dashboard routes
  if (pathname.startsWith('/submit') || pathname.startsWith('/dashboard')) {
    const token = await getToken({ req, secret });
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/submit/:path*', '/dashboard/:path*'],
};

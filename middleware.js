import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret =
  process.env.NEXTAUTH_SECRET ||
  '29054bdaa9cab6e0f9bba82d85b306fdf99fa2b20672adef2c117c853761ef69';

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Protect /submit and /dashboard routes
  if (pathname.startsWith('/submit') || pathname.startsWith('/dashboard')) {
    // 1. Try standard getToken resolution
    let token = await getToken({ req, secret });

    // 2. Try HTTPS secure cookie name (Vercel production default)
    if (!token) {
      token = await getToken({
        req,
        secret,
        cookieName: '__Secure-next-auth.session-token',
      });
    }

    // 3. Try standard HTTP cookie name fallback
    if (!token) {
      token = await getToken({
        req,
        secret,
        cookieName: 'next-auth.session-token',
      });
    }

    // 4. Fallback check on raw cookie headers
    const rawCookies = req.headers.get('cookie') || '';
    const hasSessionCookie =
      rawCookies.includes('next-auth.session-token=') ||
      rawCookies.includes('__Secure-next-auth.session-token=');

    // Only redirect if there is truly neither a valid decoded token nor a session cookie
    if (!token && !hasSessionCookie) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/submit/:path*', '/dashboard/:path*'],
};

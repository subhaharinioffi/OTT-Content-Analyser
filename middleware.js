import { withAuth } from 'next-auth/middleware';

export default withAuth({
  secret:
    process.env.NEXTAUTH_SECRET ||
    '29054bdaa9cab6e0f9bba82d85b306fdf99fa2b20672adef2c117c853761ef69',
});

export const config = {
  matcher: ['/submit', '/dashboard/:path*'],
};

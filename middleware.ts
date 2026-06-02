// middleware.ts  (new file)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // API routes require either API secret header or session cookie
  if (pathname.startsWith('/api')) {
    const apiSecret = request.headers.get('x-api-secret');
    const sessionCookie = request.cookies.get('next-auth.session-token');

    if (!apiSecret && !sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, verify the API secret matches env var
    if (apiSecret && process.env.API_SECRET && apiSecret !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Invalid API secret' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET, secureCookie: false });
  const { pathname } = request.nextUrl;

  // Allow test-db endpoint without auth for diagnostics
  if (pathname.startsWith('/api/test-db')) {
    return NextResponse.next();
  }

  // Allow NextAuth API routes without token check
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Protect all routes except auth pages and public assets
  if (!token && !pathname.startsWith('/auth') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Protect other API routes
  if (pathname.startsWith('/api')) {
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };

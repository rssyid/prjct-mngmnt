import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati file statis, aset Next.js, dan API Better Auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const hasSessionCookie =
    request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token');

  // Untuk rute API di luar /api/auth: biarkan route handler menangani dan mengembalikan 401 JSON
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Jika sudah login dan mencoba mengakses halaman login: arahkan ke Dashboard
  if (pathname === '/login' && hasSessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Jika belum login dan mengakses halaman yang dilindungi: arahkan ke halaman login
  if (!hasSessionCookie && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

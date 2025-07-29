import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth pages and API routes
  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Check if user has completed 2FA setup
  // This is a simplified check - in production you'd verify against your database
  const hasCompleted2FA = request.cookies.get('2fa_completed');

  // If user hasn't completed 2FA and is trying to access protected routes
  if (
    !hasCompleted2FA &&
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/contracts') ||
      pathname.startsWith('/licenses') ||
      pathname.startsWith('/analytics') ||
      pathname.startsWith('/uploads') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/media') ||
      pathname.startsWith('/others') ||
      pathname.startsWith('/audits') ||
      pathname.startsWith('/team'))
  ) {
    // Redirect to settings to complete 2FA setup
    return NextResponse.redirect(new URL('/settings', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

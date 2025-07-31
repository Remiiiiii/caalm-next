import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth pages, API routes, static assets, and settings
  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/assets')
  ) {
    return NextResponse.next();
  }

  // Check for logout reason cookie
  const logoutReason = request.cookies.get('logout_reason');
  if (logoutReason?.value === 'inactivity') {
    // Clear the cookie and redirect to sign-in with message
    const response = NextResponse.redirect(
      new URL('/sign-in?reason=inactivity', request.url)
    );
    response.cookies.delete('logout_reason');
    return response;
  }

  // Check if user has completed 2FA setup
  const hasCompleted2FA = request.cookies.get('2fa_completed');
  const session = request.cookies.get('appwrite-session');

  // If no session exists, redirect to sign-in
  if (!session?.value) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

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

  // For protected routes, validate session with Appwrite
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/contracts') ||
    pathname.startsWith('/licenses') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/media') ||
    pathname.startsWith('/others') ||
    pathname.startsWith('/audits') ||
    pathname.startsWith('/team')
  ) {
    try {
      // Validate session by calling our session validation endpoint
      const sessionValidationUrl = new URL('/api/auth/session', request.url);
      const sessionResponse = await fetch(sessionValidationUrl, {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      });

      if (!sessionResponse.ok) {
        // Session is invalid, redirect to sign-in
        return NextResponse.redirect(
          new URL('/sign-in?reason=session_expired', request.url)
        );
      }
    } catch (error) {
      console.error('Session validation error in middleware:', error);
      // On error, redirect to sign-in to be safe
      return NextResponse.redirect(
        new URL('/sign-in?reason=validation_error', request.url)
      );
    }
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

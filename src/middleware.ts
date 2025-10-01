import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Coming Soon Mode - redirect to coming soon page in production
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SHOW_COMING_SOON === 'true' &&
    pathname !== '/coming-soon' &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/assets') &&
    !pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  // Public routes that should never require auth
  const publicPaths = [
    '/',
    '/sign-in',
    '/sign-up',
    '/terms',
    '/privacy',
    '/coming-soon',
  ];

  // Static and system paths to always allow
  const systemPathPrefixes = ['/api', '/_next', '/favicon.ico', '/assets'];

  if (
    publicPaths.includes(pathname) ||
    systemPathPrefixes.some((p) => pathname.startsWith(p))
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

  // Define protected route prefixes
  const protectedPrefixes = [
    '/dashboard',
    '/contracts',
    '/licenses',
    '/analytics',
    '/uploads',
    '/images',
    '/media',
    '/others',
    '/audits',
    '/team',
  ];

  const isProtectedPath = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtectedPath) {
    const hasCompleted2FA = request.cookies.get('2fa_completed');
    const session = request.cookies.get('appwrite-session');

    // If user has completed 2FA, allow access even without traditional session
    if (hasCompleted2FA?.value === 'true') {
      console.log('Middleware: 2FA completed, allowing access');
      return NextResponse.next();
    }

    // If no session exists, redirect to sign-in
    if (!session?.value) {
      console.log('Middleware: No session found, redirecting to sign-in');
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // If user hasn't completed 2FA and is trying to access protected routes
    if (!hasCompleted2FA) {
      console.log('Middleware: 2FA not completed, redirecting to settings');
      // Redirect to settings to complete 2FA setup
      return NextResponse.redirect(new URL('/settings', request.url));
    }

    // If we have both session and 2FA, allow access
    console.log('Middleware: Both session and 2FA found, allowing access');
    return NextResponse.next();
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

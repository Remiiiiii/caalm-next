import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function POST(request: Request) {
  try {
    const { reason = 'manual' } = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    const session = cookieStore.get('appwrite-session');

    if (session?.value) {
      const client = new Client()
        .setEndpoint(appwriteConfig.endpointUrl)
        .setProject(appwriteConfig.projectId)
        .setSession(session.value);

      const account = new Account(client);

      try {
        // Delete the current session on Appwrite
        await account.deleteSession('current');
      } catch (error) {
        // Session might already be invalid, continue with cleanup
        console.log(
          'Session deletion error (expected for expired sessions):',
          error
        );
      }
    }

    // Clear all auth-related cookies
    cookieStore.delete('appwrite-session');
    cookieStore.delete('2fa_completed');
    cookieStore.delete('auth_status');

    // Set a flag to indicate the logout reason
    const response = NextResponse.json({
      success: true,
      reason,
      message:
        reason === 'inactivity'
          ? 'Your session expired due to inactivity.'
          : 'Successfully logged out.',
    });

    // Add a temporary cookie to show logout message on redirect
    if (reason === 'inactivity') {
      response.cookies.set('logout_reason', 'inactivity', {
        maxAge: 10, // 10 seconds
        httpOnly: false, // Allow client-side access
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}

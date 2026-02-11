import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function POST(request: Request) {
  try {
    const { reason = 'manual' } = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    const session = cookieStore.get('appwrite-session');

    // Clear all auth-related cookies immediately (don't wait for Appwrite)
    cookieStore.delete('appwrite-session');
    cookieStore.delete('2fa_completed');
    cookieStore.delete('auth_status');

    // Fire and forget - delete session on Appwrite in background (non-blocking)
    if (session?.value) {
      const client = new Client()
        .setEndpoint(appwriteConfig.endpointUrl)
        .setProject(appwriteConfig.projectId)
        .setSession(session.value);

      const account = new Account(client);

      // Don't await - let it run in background
      account.deleteSession('current').catch(() => {
        // Silently ignore - session might already be invalid
      });
    }

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
    // Even on error, clear cookies and return success for fast logout
    const cookieStore = await cookies();
    cookieStore.delete('appwrite-session');
    cookieStore.delete('2fa_completed');
    cookieStore.delete('auth_status');
    
    return NextResponse.json({
      success: true,
      reason: 'manual',
      message: 'Successfully logged out.',
    });
  }
}

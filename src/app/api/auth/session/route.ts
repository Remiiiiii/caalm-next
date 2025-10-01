import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { getCurrentUserFrom2FA } from '@/lib/actions/user.actions';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('appwrite-session');
    const hasCompleted2FA = cookieStore.get('2fa_completed');
    const twoFAUserId = cookieStore.get('2fa_user_id');

    // Check for 2FA authentication first
    if (hasCompleted2FA?.value === 'true' && twoFAUserId?.value) {
      try {
        const twoFAUser = await getCurrentUserFrom2FA();
        if (twoFAUser) {
          return NextResponse.json({
            valid: true,
            user: {
              $id: twoFAUser.$id,
              email: twoFAUser.email,
              name: twoFAUser.fullName,
            },
            authType: '2fa',
          });
        }
      } catch (error) {
        console.error('2FA user validation error:', error);
        // Fall through to traditional session check
      }
    }

    // Check for traditional Appwrite session
    if (!session?.value) {
      return NextResponse.json(
        { valid: false, reason: 'no_session' },
        { status: 401 }
      );
    }

    const client = new Client()
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId)
      .setSession(session.value);

    const account = new Account(client);

    try {
      // Try to get current user to validate session
      const user = await account.get();

      return NextResponse.json({
        valid: true,
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
        },
        authType: 'session',
      });
    } catch {
      // Session is invalid
      return NextResponse.json(
        { valid: false, reason: 'invalid_session' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { valid: false, reason: 'validation_error' },
      { status: 500 }
    );
  }
}

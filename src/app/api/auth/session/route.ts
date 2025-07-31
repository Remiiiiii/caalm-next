import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('appwrite-session');

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
      });
    } catch (error) {
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

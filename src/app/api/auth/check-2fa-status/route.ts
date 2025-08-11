import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('appwrite-session');

    if (!session?.value) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Get current user from session
    const client = new Client()
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId)
      .setSession(session.value);

    const account = new Account(client);
    const user = await account.get();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has 2FA enabled in the database
    const adminClient = await createAdminClient();
    const userResponse = await adminClient.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('accountId', user.$id)]
    );

    if (userResponse.documents.length === 0) {
      return NextResponse.json(
        { has2FA: false, needsSetup: true },
        { status: 200 }
      );
    }

    const userData = userResponse.documents[0];
    const has2FA = !!(userData.twoFactorEnabled && userData.twoFactorSecret);

    const response = NextResponse.json({
      has2FA,
      needsSetup: !has2FA,
      user: {
        $id: userData.$id,
        accountId: userData.accountId,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        department: userData.department,
      },
    });

    // If user has 2FA already set up, set the completed cookie
    if (has2FA) {
      response.cookies.set('2fa_completed', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return NextResponse.json(
      { error: 'Failed to check 2FA status' },
      { status: 500 }
    );
  }
}

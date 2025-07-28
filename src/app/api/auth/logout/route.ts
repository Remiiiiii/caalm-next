import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function POST() {
  try {
    const session = (await cookies()).get('appwrite-session');

    if (session?.value) {
      const client = new Client()
        .setEndpoint(appwriteConfig.endpointUrl)
        .setProject(appwriteConfig.projectId)
        .setSession(session.value);

      const account = new Account(client);
      await account.deleteSession('current');
    }

    // Delete the session cookie
    (await cookies()).delete('appwrite-session');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}

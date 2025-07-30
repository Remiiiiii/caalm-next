import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET(request: NextRequest) {
  try {
    const client = await createAdminClient();

    // Get a list of users for testing
    const usersResponse = await client.databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      []
    );

    // Return only essential user info for testing
    const users = usersResponse.documents.map((user) => ({
      id: user.$id,
      email: user.email || 'No email',
      name: user.fullName || user.name || 'Unknown',
      has2FA:
        user.twoFactorEnabled === true || user.twoFactorSecret !== undefined,
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error fetching test users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const client = await createAdminClient();

    // Create a test user
    const newUser = await client.databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      'unique()',
      {
        email,
        fullName: name,
        role: 'test',
        department: 'testing',
        twoFactorEnabled: false,
      }
    );

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.$id,
        email: newUser.email,
        name: newUser.fullName,
        has2FA: false,
      },
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json(
      { error: 'Failed to create test user' },
      { status: 500 }
    );
  }
}

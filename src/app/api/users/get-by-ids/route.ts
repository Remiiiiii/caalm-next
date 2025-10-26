import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty userIds array' },
        { status: 400 }
      );
    }

    // Validate configuration
    if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const adminClient = await createAdminClient();

    // Fetch users by their IDs
    const response = await adminClient.tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.or(userIds.map((id) => Query.equal('$id', id))), Query.limit(100)]
    );

    const users = response.rows.map((user: any) => ({
      $id: user.$id,
      fullName: user.fullName,
      email: user.email,
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

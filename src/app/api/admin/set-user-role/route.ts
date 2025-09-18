import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Find user by email
    const users = await tablesDB.listRows(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('email', email)]
    );

    if (users.total === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users.rows[0];

    // Update user role
    await tablesDB.updateRow(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      user.$id,
      {
        role: role,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: `User role updated to ${role}`,
        user: {
          email: user.email,
          role: role,
          fullName: user.fullName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}

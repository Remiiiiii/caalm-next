import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Fetch notifications for the user
    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      'notifications', // You'll need to create this collection
      [
        // Query for user's notifications
        // This is a placeholder - adjust based on your notification schema
      ]
    );

    return NextResponse.json({ data: notifications.documents || [] });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

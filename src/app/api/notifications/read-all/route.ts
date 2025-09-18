import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Get all unread notifications for the user
    const notifications = await tablesDB.listRows(
      appwriteConfig.databaseId,
      'notifications',
      [
        // Query for user's unread notifications
        // This is a placeholder - adjust based on your notification schema
      ]
    );

    // Mark all as read
    const updatePromises = notifications.rows.map((notification) =>
      databases.updateDocument({
        databaseId: appwriteConfig.databaseId,
        collectionId: 'notifications',
        documentId: notification.$id,
        data: { read: true, readAt: new Date().toISOString() },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { notificationId } = resolvedParams;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const { databases } = await createAdminClient();

    // Mark notification as unread
    await databases.updateDocument(
      appwriteConfig.databaseId,
      'notifications',
      notificationId,
      {
        isRead: false,
        readAt: null,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notification as unread:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as unread' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import CacheManager from '@/lib/services/cache-manager';

export async function DELETE(
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

    const { tablesDB } = await createAdminClient();

    // First, get the notification to find the userId for cache invalidation
    let userId: string | null = null;
    try {
      const notification = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: notificationId,
      });
      userId = (notification as any).userId;
    } catch (getError) {
      console.warn('Could not fetch notification before deletion (non-critical):', getError);
    }

    // Delete the notification
    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.notificationsCollectionId || 'notifications',
      rowId: notificationId,
    });

    // Invalidate cache immediately for instant UI update
    if (userId) {
      try {
        await CacheManager.invalidateNotifications(userId);
        console.log(`[SERVER] Invalidated notification cache for userId: ${userId} after deletion`);
      } catch (cacheError) {
        console.warn('Could not invalidate cache after deletion (non-critical):', cacheError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

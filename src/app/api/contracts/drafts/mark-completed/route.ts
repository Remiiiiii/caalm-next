import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerId, fileName, draftId } = body;

    if (!ownerId) {
      return NextResponse.json(
        { error: 'Owner ID is required' },
        { status: 400 }
      );
    }

    if (!fileName && !draftId) {
      return NextResponse.json(
        { error: 'Either file name or draft ID is required' },
        { status: 400 }
      );
    }

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const { tablesDB } = await createAdminClient();
    const markedDraftIds: string[] = [];

    // If draftId is provided, mark that specific draft as completed
    if (draftId) {
      try {
        await tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: draftId,
          data: {
            isCompleted: true,
          },
        });
        markedDraftIds.push(draftId);
        console.log(`Marked draft ${draftId} as completed`);
      } catch (error: any) {
        console.error(`Error marking draft ${draftId} as completed:`, error);
      }
    }

    // If fileName is provided, find and mark all matching drafts as completed
    if (fileName) {
      try {
        // Query ALL drafts for this owner (including already completed ones)
        const allDraftsResponse = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          queries: [
            Query.equal('ownerId', ownerId),
            Query.equal('isCompleted', false), // Only mark incomplete drafts
            Query.orderDesc('lastSavedAt'),
            Query.limit(100),
          ],
        });

        const allDrafts = allDraftsResponse.rows || [];

        // Find ALL drafts with matching file name
        const matchingDrafts = allDrafts.filter((draft: any) => {
          try {
            const fileData = draft.processedFileData
              ? JSON.parse(draft.processedFileData)
              : null;
            return fileData?.name === fileName;
          } catch {
            return false;
          }
        });

        // Mark all matching drafts as completed
        for (const draft of matchingDrafts) {
          try {
            await tablesDB.updateRow({
              databaseId: appwriteConfig.databaseId,
              tableId: appwriteConfig.contractDraftsCollectionId,
              rowId: draft.$id,
              data: {
                isCompleted: true,
              },
            });
            markedDraftIds.push(draft.$id);
            console.log(`Marked draft ${draft.$id} as completed for file: ${fileName}`);
          } catch (error: any) {
            console.error(`Error marking draft ${draft.$id} as completed:`, error);
          }
        }
      } catch (error: any) {
        console.error('Error finding matching drafts:', error);
      }
    }

    // Invalidate cache for this owner's drafts
    try {
      await CacheManager.invalidate(CACHE_KEYS.contracts.drafts(ownerId));
    } catch (cacheError) {
      console.warn('Failed to invalidate cache:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${markedDraftIds.length} draft(s) as completed`,
      markedDrafts: markedDraftIds,
    });
  } catch (error: any) {
    console.error('Error marking drafts as completed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark drafts as completed' },
      { status: 500 }
    );
  }
}







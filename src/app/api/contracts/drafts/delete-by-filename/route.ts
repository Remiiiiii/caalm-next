import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';

const FILES_COLLECTION_ID = '6934a3120033b4a5c4da';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerId, fileName } = body;

    if (!ownerId || !fileName) {
      return NextResponse.json(
        { error: 'Owner ID and file name are required' },
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

    // Query ALL drafts for this owner (including completed ones)
    const allDraftsResponse = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      queries: [
        Query.equal('ownerId', ownerId),
        Query.orderDesc('lastSavedAt'),
        Query.limit(100),
      ],
    });

    const allDrafts = allDraftsResponse.rows || [];
    const deletedDraftIds: string[] = [];
    const deletedFileIds: string[] = [];

    // Find ALL drafts with matching file name (including completed ones)
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

    // Delete all matching drafts and their associated files
    for (const draft of matchingDrafts) {
      try {
        // Get file ID from the draft's processedFileData
        let fileId: string | null = null;
        try {
          const processedFileData = draft.processedFileData
            ? JSON.parse(draft.processedFileData)
            : null;
          if (processedFileData && processedFileData.name) {
            const files = await tablesDB.listRows({
              databaseId: appwriteConfig.databaseId,
              tableId: FILES_COLLECTION_ID,
              queries: [
                Query.equal('owner', draft.ownerId),
                Query.equal('name', processedFileData.name),
                Query.limit(1),
              ],
            });
            if (files.total > 0) {
              fileId = files.rows[0].$id;
            }
          }
        } catch (fileError: any) {
          console.warn('Could not find file for draft:', fileError.message);
        }

        // Delete file entry (if exists)
        if (fileId) {
          try {
            // Clear owner relationship first
            try {
              const fileDoc = await tablesDB.getRow({
                databaseId: appwriteConfig.databaseId,
                tableId: FILES_COLLECTION_ID,
                rowId: fileId,
              });
              if (fileDoc.owner) {
                await tablesDB.updateRow({
                  databaseId: appwriteConfig.databaseId,
                  tableId: FILES_COLLECTION_ID,
                  rowId: fileId,
                  data: { owner: null },
                });
              }
            } catch (clearError: any) {
              console.warn('Could not clear owner relationship:', clearError.message);
            }

            await tablesDB.deleteRow({
              databaseId: appwriteConfig.databaseId,
              tableId: FILES_COLLECTION_ID,
              rowId: fileId,
            });
            deletedFileIds.push(fileId);
            console.log(`Deleted file ${fileId} associated with draft ${draft.$id}`);
          } catch (fileDeleteError: any) {
            console.warn('Error deleting file:', fileDeleteError.message);
          }
        }

        // Delete the draft
        await tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: draft.$id,
        });
        deletedDraftIds.push(draft.$id);
        console.log(`Deleted draft ${draft.$id}`);
      } catch (error: any) {
        console.error(`Error deleting draft ${draft.$id}:`, error);
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
      message: `Deleted ${deletedDraftIds.length} draft(s) and ${deletedFileIds.length} file(s)`,
      deleted: {
        drafts: deletedDraftIds,
        files: deletedFileIds,
      },
    });
  } catch (error: any) {
    console.error('Error deleting drafts by filename:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete drafts' },
      { status: 500 }
    );
  }
}









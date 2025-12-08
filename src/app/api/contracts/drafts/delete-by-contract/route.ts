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
    const { contractId, ownerId } = body;

    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
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

    // Find all drafts linked to this contract using contractId string attribute
    // Note: contractId is stored as a string (not relationship) due to row width limits
    const draftsResponse = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      queries: [
        Query.equal('contractId', contractId),
        ...(ownerId ? [Query.equal('ownerId', ownerId)] : []),
      ],
    });

    const draftsToDelete = draftsResponse.rows || [];
    const deletedDraftIds: string[] = [];
    const deletedFileIds: string[] = [];

    // Delete all drafts linked to this contract
    for (const draft of draftsToDelete) {
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
              console.warn(
                'Could not clear owner relationship:',
                clearError.message
              );
            }

            await tablesDB.deleteRow({
              databaseId: appwriteConfig.databaseId,
              tableId: FILES_COLLECTION_ID,
              rowId: fileId,
            });
            deletedFileIds.push(fileId);
            console.log(
              `Deleted file ${fileId} associated with draft ${draft.$id}`
            );
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
        console.log(
          `Deleted draft ${draft.$id} linked to contract ${contractId}`
        );
      } catch (error: any) {
        console.error(`Error deleting draft ${draft.$id}:`, error);
      }
    }

    // Invalidate cache for this owner's drafts
    if (ownerId) {
      try {
        await CacheManager.invalidate(CACHE_KEYS.contracts.drafts(ownerId));
      } catch (cacheError) {
        console.warn('Failed to invalidate cache:', cacheError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedDraftIds.length} draft(s) and ${deletedFileIds.length} file(s) linked to contract ${contractId}`,
      deleted: {
        drafts: deletedDraftIds,
        files: deletedFileIds,
      },
    });
  } catch (error: any) {
    console.error('Error deleting drafts by contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete drafts' },
      { status: 500 }
    );
  }
}

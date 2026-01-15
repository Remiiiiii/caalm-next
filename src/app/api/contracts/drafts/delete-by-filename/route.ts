import { NextRequest } from 'next/server';
import { appwriteConfig } from '@/lib/appwrite/config';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuthAndOwner } from '@/lib/api/contracts/middleware/auth.middleware';
import { DraftService } from '@/lib/api/contracts/services/DraftService';
import { parseAndValidateBody } from '@/lib/api/contracts/middleware/validation.middleware';
import { z } from 'zod';

const deleteByFilenameSchema = z.object({
  ownerId: z.string().min(1, 'Owner ID is required'),
  fileName: z.string().min(1, 'File name is required'),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    // Validate request body
    const body = await parseAndValidateBody(request, deleteByFilenameSchema);
    const { ownerId, fileName } = body;

    // Authentication and authorization
    const authError = await requireAuthAndOwner(request, ownerId);
    if (authError) return authError;

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      return errorResponse(new Error('Database configuration missing'), 500, {
        requestId,
      });
    }

    // Find all drafts with matching file name
    const matchingDrafts = await DraftService.findDraftsByFileName(
      ownerId,
      fileName
    );

    const deletedDraftIds: string[] = [];
    const deletedFileIds: string[] = [];

    // Delete all matching drafts and their associated files
    for (const draft of matchingDrafts) {
      try {
        const deleted = await DraftService.deleteDraft(
          draft.$id,
          draft.ownerId as string
        );
        deletedDraftIds.push(deleted.draftId);
        if (deleted.fileId) {
          deletedFileIds.push(deleted.fileId);
        }
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

    return successResponse(
      {
        deleted: {
          drafts: deletedDraftIds,
          files: deletedFileIds,
        },
      },
      {
        requestId,
        message: `Deleted ${deletedDraftIds.length} draft(s) and ${deletedFileIds.length} file(s)`,
      }
    );
  } catch (error: any) {
    console.error('Error deleting drafts by filename:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to delete drafts'),
      500,
      { requestId }
    );
  }
}

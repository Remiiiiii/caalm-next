import { NextRequest } from 'next/server';
import { appwriteConfig } from '@/lib/appwrite/config';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import {
  requireAuth,
  requireAuthAndOwner,
} from '@/lib/api/contracts/middleware/auth.middleware';
import { DraftService } from '@/lib/api/contracts/services/DraftService';
import { parseAndValidateBody } from '@/lib/api/contracts/middleware/validation.middleware';
import { z } from 'zod';

const deleteByContractSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  ownerId: z.string().optional(),
});

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

    // Find all drafts linked to this contract
    const draftsToDelete = await DraftService.findDraftsByContractId(
      contractId,
      ownerId || undefined
    );

    const deletedDraftIds: string[] = [];
    const deletedFileIds: string[] = [];

    // Delete all drafts linked to this contract
    for (const draft of draftsToDelete) {
      try {
        const deleted = await DraftService.deleteDraft(
          draft.$id,
          draft.ownerId as string
        );
        deletedDraftIds.push(deleted.draftId);
        if (deleted.fileId) {
          deletedFileIds.push(deleted.fileId);
        }
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

    return successResponse(
      {
      deleted: {
        drafts: deletedDraftIds,
        files: deletedFileIds,
      },
      },
      {
        requestId,
        message: `Deleted ${deletedDraftIds.length} draft(s) and ${deletedFileIds.length} file(s) linked to contract ${contractId}`,
      }
    );
  } catch (error: any) {
    console.error('Error deleting drafts by contract:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to delete drafts'),
      500,
      { requestId }
    );
  }
}

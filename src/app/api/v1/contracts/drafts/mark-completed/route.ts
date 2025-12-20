import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuthAndOwner } from '@/lib/api/contracts/middleware/auth.middleware';
import { DraftService } from '@/lib/api/contracts/services/DraftService';
import { parseAndValidateBody } from '@/lib/api/contracts/middleware/validation.middleware';
import { z } from 'zod';

const markCompletedSchema = z.object({
  ownerId: z.string().min(1, 'Owner ID is required'),
  fileName: z.string().optional(),
  draftId: z.string().optional(),
}).refine((data) => data.fileName || data.draftId, {
  message: 'Either file name or draft ID is required',
});

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

    const markedDraftIds: string[] = [];

    // If draftId is provided, mark that specific draft as completed
    if (draftId) {
      try {
        await DraftService.markDraftAsCompleted(draftId);
        markedDraftIds.push(draftId);
        console.log(`Marked draft ${draftId} as completed`);
      } catch (error: any) {
        console.error(`Error marking draft ${draftId} as completed:`, error);
      }
    }

    // If fileName is provided, find and mark all matching drafts as completed
    if (fileName) {
      try {
        const matchingDrafts = await DraftService.findDraftsByFileName(
          ownerId,
          fileName
        );

        // Mark all matching incomplete drafts as completed
        for (const draft of matchingDrafts) {
          if (!draft.isCompleted) {
            try {
              await DraftService.markDraftAsCompleted(draft.$id);
              markedDraftIds.push(draft.$id);
              console.log(
                `Marked draft ${draft.$id} as completed for file: ${fileName}`
              );
            } catch (error: any) {
              console.error(
                `Error marking draft ${draft.$id} as completed:`,
                error
              );
            }
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

    return successResponse(
      { markedDrafts: markedDraftIds },
      {
        requestId,
        message: `Marked ${markedDraftIds.length} draft(s) as completed`,
      }
    );
  } catch (error: any) {
    console.error('Error marking drafts as completed:', error);
    return errorResponse(
      error instanceof Error
        ? error
        : new Error('Failed to mark drafts as completed'),
      500,
      { requestId }
    );
  }
}
















import { NextRequest } from 'next/server';
import { getContractsForManager } from '@/lib/actions/file.actions';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuth } from '@/lib/api/contracts/middleware/auth.middleware';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const requestId = generateRequestId();
  // Authentication and verify user can access this manager's contracts
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { userId } = await params;
    console.log('Fetching contracts for manager:', userId, { requestId });

    // Cache key for manager's contracts
    const cacheKey = CACHE_KEYS.contracts.manager(userId);

    // Fetch manager contracts with caching (5 minutes TTL)
    const contracts = await CacheManager.withCache(
      'contracts/manager',
      cacheKey,
      async () => {
        const data = await getContractsForManager(userId);
        console.log('Contracts fetched for manager:', data?.length || 0);
        return data || [];
      }
    );

    return successResponse(contracts, { requestId });
  } catch (error) {
    console.error('Error fetching manager contracts:', error);
    return errorResponse(
      error instanceof Error
        ? error
        : new Error('Failed to fetch manager contracts'),
      500,
      { requestId }
    );
  }
}

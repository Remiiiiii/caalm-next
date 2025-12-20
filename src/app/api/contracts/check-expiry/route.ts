import { NextRequest } from 'next/server';
import { contractExpiryService } from '@/lib/services/contractExpiryService';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuth } from '@/lib/api/contracts/middleware/auth.middleware';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Manual contract expiry check triggered');

    // Run the contract expiry check
    await contractExpiryService.checkContractExpiry();

    return NextResponse.json({
      success: true,
      message: 'Contract expiry check completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error during contract expiry check:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check contract expiry',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const requestId = generateRequestId();
  try {
    return successResponse(
      {
        message: 'Contract expiry check endpoint is available',
        usage:
          'POST to this endpoint to manually trigger contract expiry checks',
      },
      { requestId }
    );
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to get endpoint info'),
      500,
      { requestId }
    );
  }
}

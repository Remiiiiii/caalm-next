import { NextRequest, NextResponse } from 'next/server';
import { contractExpiryService } from '@/lib/services/contractExpiryService';

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
  try {
    return NextResponse.json({
      message: 'Contract expiry check endpoint is available',
      usage: 'POST to this endpoint to manually trigger contract expiry checks',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get endpoint info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

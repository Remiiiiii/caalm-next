import { NextRequest, NextResponse } from 'next/server';

/**
 * Auto-sync endpoint that polls Outlook for changes
 * This endpoint should be called periodically (every 30 seconds) by a client-side interval for near-instant updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Auto-sync triggered for user:', userId);

    // Call the main sync endpoint
    const syncResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/microsoft/calendar/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          // CRITICAL FIX: Use same date range as main sync (±30 days) to prevent old events from being synced
          // This prevents August/September events from being processed when creating new events
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          strategy: 'newest',
        }),
      }
    );

    const syncResult = await syncResponse.json();

    if (syncResult.success) {
      console.log('✅ Auto-sync completed successfully:', {
        syncedEvents: syncResult.result?.syncedEvents || 0,
        conflicts: syncResult.result?.conflicts?.length || 0,
        errors: syncResult.result?.errors?.length || 0,
      });

      return NextResponse.json({
        success: true,
        message: 'Auto-sync completed',
        result: syncResult.result,
      });
    } else {
      console.error('❌ Auto-sync failed:', syncResult);
      return NextResponse.json(
        {
          success: false,
          message: 'Auto-sync failed',
          error: syncResult.error || syncResult.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in auto-sync:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Auto-sync error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check auto-sync status
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Auto-sync endpoint is active',
    recommendedInterval: '30 seconds',
  });
}



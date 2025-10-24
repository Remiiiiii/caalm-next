import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getValidIntegration } from '@/lib/actions/calendar-integration.actions';
import { getCalendarEvents } from '@/lib/actions/calendar.actions';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔍 Simple sync test for user:', userId);

    // Check integration
    const integration = await getValidIntegration(userId, 'microsoft');
    if (!integration) {
      return NextResponse.json({
        success: false,
        message: 'No Microsoft integration found',
        userId,
        integration: false,
      });
    }

    // Get CAALM events
    const caalmEvents = await getCalendarEvents();
    console.log('📅 CAALM events count:', caalmEvents.length);

    return NextResponse.json({
      success: true,
      message: 'Basic sync test completed',
      userId,
      integration: true,
      caalmEvents: caalmEvents.length,
      syncEnabled: integration.sync_enabled,
      lastSync: integration.last_sync,
      tokenExpiry: integration.token_expiry,
    });
  } catch (error) {
    console.error('❌ Simple sync test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Sync test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


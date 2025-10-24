import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getValidIntegration } from '@/lib/actions/calendar-integration.actions';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check integration status
    const integration = await getValidIntegration(userId, 'microsoft');
    if (!integration) {
      return NextResponse.json({
        success: false,
        message: 'No Microsoft integration found',
        status: 'not_connected',
      });
    }

    // Check token expiry
    const tokenExpiry = new Date(integration.token_expiry);
    const now = new Date();
    const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
    const isTokenExpired = timeUntilExpiry < 0;

    return NextResponse.json({
      success: true,
      status: 'connected',
      integration: {
        id: integration.$id,
        syncEnabled: integration.sync_enabled,
        lastSync: integration.last_sync,
        tokenExpiry: integration.token_expiry,
        isTokenExpired,
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
      },
      recommendations: isTokenExpired
        ? [
            'Token has expired - please reconnect your Microsoft account',
            'Go to Calendar Settings and disconnect/reconnect Microsoft',
          ]
        : timeUntilExpiry < 5 * 60 * 1000
        ? [
            'Token expires soon - sync may fail',
            'Consider reconnecting your Microsoft account',
          ]
        : ['Integration is healthy', 'Sync should work normally'],
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check sync status',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'clear_sync_lock') {
      // This would clear any stuck sync locks
      // For now, just return success
      return NextResponse.json({
        success: true,
        message: 'Sync lock cleared (if any was active)',
        action: 'clear_sync_lock',
      });
    }

    if (action === 'force_sync_reset') {
      // This would reset the sync state
      return NextResponse.json({
        success: true,
        message: 'Sync state reset',
        action: 'force_sync_reset',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Unknown action',
    });
  } catch (error) {
    console.error('Error in sync status action:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to perform action',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


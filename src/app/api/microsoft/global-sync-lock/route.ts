import { NextRequest, NextResponse } from 'next/server';

// Global sync lock to prevent concurrent sync operations
let globalSyncLock = {
  isLocked: false,
  lockedAt: 0,
  lockedBy: '',
  message: '',
};

const LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes timeout for stale locks

/**
 * GET /api/microsoft/global-sync-lock
 * Returns the current status of the global sync lock
 */
export async function GET(request: NextRequest) {
  // Check if lock has expired
  const now = Date.now();
  if (globalSyncLock.isLocked && now - globalSyncLock.lockedAt > LOCK_TIMEOUT) {
    console.log('Global sync lock has expired, clearing it');
    globalSyncLock = {
      isLocked: false,
      lockedAt: 0,
      lockedBy: '',
      message: '',
    };
  }

  return NextResponse.json({
    locked: globalSyncLock.isLocked,
    lockedBy: globalSyncLock.lockedBy || undefined,
    lockedAt: globalSyncLock.lockedAt > 0 
      ? new Date(globalSyncLock.lockedAt).toISOString() 
      : undefined,
    message: globalSyncLock.message || undefined,
  });
}

/**
 * POST /api/microsoft/global-sync-lock
 * Sets or clears the global sync lock
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, message, lockedBy } = body;

    if (action === 'lock') {
      // Set the global lock
      globalSyncLock = {
        isLocked: true,
        lockedAt: Date.now(),
        lockedBy: lockedBy || 'system',
        message: message || 'Global sync lock is active',
      };
      
      console.log('🚨 Global sync lock ACTIVATED', {
        lockedBy: globalSyncLock.lockedBy,
        message: globalSyncLock.message,
      });

      return NextResponse.json({
        success: true,
        message: 'Global sync lock activated',
        locked: true,
      });
    } else if (action === 'unlock') {
      // Clear the global lock
      console.log('✅ Global sync lock DEACTIVATED');
      
      globalSyncLock = {
        isLocked: false,
        lockedAt: 0,
        lockedBy: '',
        message: '',
      };

      return NextResponse.json({
        success: true,
        message: 'Global sync lock deactivated',
        locked: false,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid action. Use "lock" or "unlock"',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error handling global sync lock:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to handle sync lock',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

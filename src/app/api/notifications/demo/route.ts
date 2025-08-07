import { NextResponse } from 'next/server';
import { triggerDemoNotifications } from '@/lib/utils/notificationTriggers';
import { getCurrentUser } from '@/lib/actions/user.actions';

export async function POST() {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Trigger demo notifications for the current user
    await triggerDemoNotifications(currentUser.$id);

    return NextResponse.json({
      success: true,
      message: 'Demo notifications triggered successfully',
      userId: currentUser.$id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to trigger demo notifications:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger demo notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Demo notification endpoint',
    usage: 'POST /api/notifications/demo to trigger demo notifications',
    availableNotifications: [
      'file-uploaded',
      'contract-expiry',
      'contract-renewal',
      'user-invited',
      'audit-due',
      'compliance-alert',
      'system-update',
      'performance-metric',
      'deadline-approaching',
      'task-completed',
      'info',
    ],
  });
}

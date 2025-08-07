import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const { notificationId } = params;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const notification = await notificationService.markAsRead(notificationId);

    return NextResponse.json({ data: notification });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to mark notification as read',
      },
      { status: 500 }
    );
  }
}

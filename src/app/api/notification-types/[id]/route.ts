import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { NotificationType } from '@/types/notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationType = await notificationService.getNotificationType(
      params.id
    );

    if (!notificationType) {
      return NextResponse.json(
        { error: 'Notification type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: notificationType });
  } catch (error) {
    console.error('Failed to fetch notification type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification type' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: Partial<NotificationType> = await request.json();

    const notificationType = await notificationService.updateNotificationType(
      params.id,
      body
    );

    return NextResponse.json({ data: notificationType });
  } catch (error) {
    console.error('Failed to update notification type:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update notification type',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await notificationService.deleteNotificationType(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete notification type:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete notification type',
      },
      { status: 500 }
    );
  }
}

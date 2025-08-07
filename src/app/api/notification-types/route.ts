import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { NotificationType } from '@/types/notifications';

export async function GET() {
  try {
    const notificationTypes = await notificationService.getNotificationTypes();
    return NextResponse.json({ data: notificationTypes });
  } catch (error) {
    console.error('Failed to fetch notification types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Omit<NotificationType, '$id' | '$createdAt' | '$updatedAt'> =
      await request.json();

    // Validate required fields
    if (!body.type_key || !body.label || !body.priority) {
      return NextResponse.json(
        { error: 'Missing required fields: type_key, label, priority' },
        { status: 400 }
      );
    }

    const notificationType = await notificationService.createNotificationType(
      body
    );

    return NextResponse.json({ data: notificationType }, { status: 201 });
  } catch (error) {
    console.error('Failed to create notification type:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create notification type',
      },
      { status: 500 }
    );
  }
}

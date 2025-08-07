import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const stats = await notificationService.getNotificationStats(userId);

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Failed to fetch notification stats:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch notification stats',
      },
      { status: 500 }
    );
  }
}

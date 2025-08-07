import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import {
  CreateNotificationRequest,
  NotificationFilters,
  NotificationSort,
} from '@/types/notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const sortField = searchParams.get('sortField') || 'date';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build filters
    const filters: NotificationFilters = {};
    if (search) filters.search = search;
    if (type && type !== 'all') filters.type = type;
    if (status && status !== 'all')
      filters.status = status as 'read' | 'unread';
    if (priority && priority !== 'all')
      filters.priority = priority as 'low' | 'medium' | 'high' | 'urgent';

    // Build sort
    const sort: NotificationSort = {
      field: sortField as 'date' | 'priority' | 'type' | 'title',
      direction: sortDirection as 'asc' | 'desc',
    };

    const result = await notificationService.getNotifications(
      userId,
      Object.keys(filters).length > 0 ? filters : undefined,
      sort,
      page,
      limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateNotificationRequest = await request.json();

    // Validate required fields
    if (!body.userId || !body.title || !body.message || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message, type' },
        { status: 400 }
      );
    }

    const notification = await notificationService.createNotification(body);

    return NextResponse.json({ data: notification }, { status: 201 });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create notification',
      },
      { status: 500 }
    );
  }
}

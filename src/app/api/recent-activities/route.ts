import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivities } from '@/lib/actions/recentActivity.actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    console.log('Fetching recent activities with limit:', limit);

    const activities = await getRecentActivities(limit);
    console.log('Recent activities fetched:', activities.length);

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
}

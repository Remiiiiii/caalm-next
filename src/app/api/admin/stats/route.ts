import { NextResponse } from 'next/server';
import { listAllUsers } from '@/lib/actions/user.actions';
import { getRecentActivities } from '@/lib/actions/recentActivity.actions';

export async function GET() {
  try {
    console.log('Fetching admin statistics');

    // Fetch users
    const users = await listAllUsers();
    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter((u) => u.status === 'active').length || 0;
    const pendingUsers =
      users?.filter((u) => u.status === 'pending').length || 0;

    // Fetch recent activities
    const activities = await getRecentActivities(100); // Get more activities for admin view
    const totalActivities = activities?.length || 0;
    const recentActivities =
      activities?.filter((a) => {
        const activityDate = new Date(a.timestamp);
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        return activityDate > oneDayAgo;
      }).length || 0;

    // Determine system health based on various metrics
    let systemHealth: 'good' | 'warning' | 'critical' = 'good';
    if (pendingUsers > totalUsers * 0.1) {
      systemHealth = 'warning';
    }
    if (pendingUsers > totalUsers * 0.2 || totalUsers === 0) {
      systemHealth = 'critical';
    }

    const stats = {
      totalUsers,
      activeUsers,
      pendingUsers,
      totalActivities,
      recentActivities,
      systemHealth,
    };

    console.log('Admin stats calculated:', stats);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}

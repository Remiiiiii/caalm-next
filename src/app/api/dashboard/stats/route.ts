import { NextRequest, NextResponse } from 'next/server';
import {
  getTotalContractsCount,
  getExpiringContractsCount,
} from '@/lib/actions/file.actions';
import { getActiveUsersCount } from '@/lib/actions/user.actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Fetch dashboard stats in parallel
    const [totalContracts, expiringContracts, activeUsers] = await Promise.all([
      getTotalContractsCount(),
      getExpiringContractsCount(),
      getActiveUsersCount(),
    ]);

    const stats = {
      totalContracts,
      expiringContracts,
      activeUsers,
      complianceRate: '95%', // This could be calculated based on actual data
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

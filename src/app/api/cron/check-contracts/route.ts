import { NextRequest, NextResponse } from 'next/server';
import { checkContractExpirations } from '@/lib/actions/notification.actions';

export async function GET(request: NextRequest) {
  // Verify the request is from a legitimate cron service
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkContractExpirations();
    return NextResponse.json({
      success: true,
      notificationsCreated: result?.notificationsCreated || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to check contract expirations:', error);
    return NextResponse.json(
      { error: 'Failed to check contract expirations' },
      { status: 500 }
    );
  }
}

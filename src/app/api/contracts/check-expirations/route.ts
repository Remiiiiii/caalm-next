import { NextResponse } from 'next/server';
import { checkContractExpirations } from '@/lib/actions/notification.actions';

export async function POST() {
  try {
    const result = await checkContractExpirations();
    return NextResponse.json({
      success: true,
      notificationsCreated: result?.notificationsCreated || 0,
    });
  } catch (error) {
    console.error('Failed to check contract expirations:', error);
    return NextResponse.json(
      { error: 'Failed to check contract expirations' },
      { status: 500 }
    );
  }
}

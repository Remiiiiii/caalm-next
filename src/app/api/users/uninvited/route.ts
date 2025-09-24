import { NextRequest, NextResponse } from 'next/server';
import { getUninvitedUsers } from '@/lib/actions/user.actions';

export async function GET(request: NextRequest) {
  try {
    const uninvitedUsers = await getUninvitedUsers();

    return NextResponse.json({
      data: uninvitedUsers,
      success: true,
    });
  } catch (error) {
    console.error('Failed to fetch uninvited users:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch uninvited users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

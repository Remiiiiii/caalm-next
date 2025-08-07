import { NextRequest, NextResponse } from 'next/server';
import { listPendingInvitations } from '@/lib/actions/user.actions';

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

    // Fetch pending invitations
    const invitations = await listPendingInvitations({ orgId });

    return NextResponse.json({ data: invitations });
  } catch (error) {
    console.error('Failed to fetch dashboard invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard invitations' },
      { status: 500 }
    );
  }
}

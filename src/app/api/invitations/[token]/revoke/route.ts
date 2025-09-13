import { NextRequest, NextResponse } from 'next/server';
import { revokeInvitation } from '@/lib/actions/user.actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const { token } = resolvedParams;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Revoke invitation using the existing action
    await revokeInvitation({ token });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke invitation:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    );
  }
}

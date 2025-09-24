import { NextRequest, NextResponse } from 'next/server';
import { deleteInvitation } from '@/lib/actions/user.actions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const { token } = resolvedParams;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Delete invitation using the existing action
    await deleteInvitation({ token });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete invitation:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}

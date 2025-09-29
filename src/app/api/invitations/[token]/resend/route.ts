import { NextRequest, NextResponse } from 'next/server';
import { resendInvitation } from '@/lib/actions/user.actions';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const result = await resendInvitation({ token });

    return NextResponse.json({
      success: true,
      message: `Invitation resent successfully to ${result.email}`,
      data: result,
    });
  } catch (error) {
    console.error('Resend invitation error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to resend invitation';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

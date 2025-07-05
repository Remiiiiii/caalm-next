import { NextRequest, NextResponse } from 'next/server';
import { acceptInvitation } from '@/lib/actions/user.actions';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json(
      { error: 'No invitation token provided.' },
      { status: 400 }
    );
  }

  try {
    const result = await acceptInvitation({ token });
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to accept invitation.';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

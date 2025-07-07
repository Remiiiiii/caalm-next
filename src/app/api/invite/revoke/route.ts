import { NextRequest, NextResponse } from 'next/server';
import { revokeInvitation } from '@/lib/actions/user.actions';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token)
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  try {
    const result = await revokeInvitation({ token });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    let message = 'Internal Server Error';
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

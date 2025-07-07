import { NextRequest, NextResponse } from 'next/server';
import { createInvitation } from '@/lib/actions/user.actions';

export async function POST(req: NextRequest) {
  const { name, email, role, orgId, invitedBy } = await req.json();
  if (!name || !email || !role || !orgId || !invitedBy) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }
  try {
    const result = await createInvitation({
      name,
      email,
      role,
      orgId,
      invitedBy,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    let message = 'Internal Server Error';
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

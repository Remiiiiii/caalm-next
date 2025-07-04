import { NextRequest, NextResponse } from 'next/server';
import { createInvitation } from '@/lib/actions/user.actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, orgId, invitedBy } = body;
    if (!name || !email || !role || !orgId || !invitedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    const result = await createInvitation({
      name,
      email,
      role,
      orgId,
      invitedBy,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    let message = 'Internal Server Error';
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createInvitation } from '@/lib/actions/user.actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role, department, orgId, invitedBy } = body;

    // Validate required fields
    if (!email || !name || !role || !department || !orgId || !invitedBy) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: email, name, role, department, orgId, invitedBy',
        },
        { status: 400 }
      );
    }

    // Create invitation using the existing action
    const invitation = await createInvitation({
      email,
      name,
      role,
      department,
      orgId,
      invitedBy,
    });

    return NextResponse.json({ data: invitation });
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

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
    console.error('Failed to create invitation:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: body,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to create invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

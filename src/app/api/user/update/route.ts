import { NextRequest, NextResponse } from 'next/server';
import { updateUserProfile } from '@/lib/actions/user.actions';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, fullName, role, division, avatarUrl } = body;
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }
    // Validate division if provided
    const allowedDivisions = [
      'behavioral-health',
      'child-welfare',
      'clinic',
      'c-suite',
      'cfs',
      'hr',
      'residential',
      'support',
      'help-desk',
      'accounting',
    ];
    let divisionValue = undefined;
    if (division !== undefined) {
      if (!allowedDivisions.includes(division)) {
        return NextResponse.json(
          { error: 'Invalid division value' },
          { status: 400 }
        );
      }
      divisionValue = division;
    }
    const updatedUser = await updateUserProfile({
      accountId,
      fullName,
      role,
      division: divisionValue,
      avatarUrl,
    });
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
}

export function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export function POST() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export function PUT() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export function DELETE() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

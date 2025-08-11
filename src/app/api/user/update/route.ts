import { NextRequest, NextResponse } from 'next/server';
import { updateUserProfile } from '@/lib/actions/user.actions';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, fullName, role, department } = body;
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }
    // Validate department if provided
    const allowedDepartments = [
      'childwelfare',
      'behavioralhealth',
      'finance',
      'operations',
      'administration',
      'c-suite',
      'managerial',
    ];
    let departmentValue = undefined;
    if (department !== undefined) {
      if (!allowedDepartments.includes(department)) {
        return NextResponse.json(
          { error: 'Invalid department value' },
          { status: 400 }
        );
      }
      departmentValue = department;
    }
    const updatedUser = await updateUserProfile({
      accountId,
      fullName,
      role,
      department: departmentValue,
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

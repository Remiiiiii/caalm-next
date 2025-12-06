import { NextResponse } from 'next/server';
import { updateUserDepartment } from '@/lib/actions/user.actions';

/**
 * Temporary endpoint to fix user department update issue
 * PATCH /api/fix-user-department
 */
export async function POST() {
  try {
    const userId = '68682eba0038a0e0b7fd';
    const department = 'Administration';

    const updatedUser = await updateUserDepartment({
      userId,
      department,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user department' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User department updated successfully',
      user: {
        $id: updatedUser.$id,
        department: updatedUser.department,
        orgId: updatedUser.orgId,
      },
    });
  } catch (error: any) {
    console.error('Error updating user department:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to update user department',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


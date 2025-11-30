import { NextRequest, NextResponse } from 'next/server';
import {
  updateEscalationRule,
  deleteEscalationRule,
} from '@/lib/services/calendar-notifications.service';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';

/**
 * PUT /api/calendar/escalation-rules/[ruleId]
 * Update an escalation rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // Check permission - only admins can update escalation rules
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.SETTINGS.EDIT,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserByAccountId(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Parameters<typeof updateEscalationRule>[1] = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.triggerEvent !== undefined) {
      updates.triggerEvent = body.triggerEvent;
    }
    if (body.delayMinutes !== undefined) {
      updates.delayMinutes = body.delayMinutes;
    }
    if (body.escalationChannels !== undefined) {
      updates.escalationChannels = body.escalationChannels;
    }
    if (body.escalateToUserIds !== undefined) {
      updates.escalateToUserIds = body.escalateToUserIds;
    }
    if (body.isActive !== undefined) {
      updates.isActive = body.isActive;
    }

    const rule = await updateEscalationRule(params.ruleId, updates);

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error(
      '[SERVER] PUT /api/calendar/escalation-rules/[ruleId]] Error:',
      error
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update escalation rule',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/escalation-rules/[ruleId]
 * Delete an escalation rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // Check permission - only admins can delete escalation rules
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.SETTINGS.EDIT,
    });

    if (permissionCheck) {
      return permissionCheck;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    await deleteEscalationRule(params.ruleId);

    return NextResponse.json({
      success: true,
      message: 'Escalation rule deleted successfully',
    });
  } catch (error) {
    console.error(
      '[SERVER] DELETE /api/calendar/escalation-rules/[ruleId]] Error:',
      error
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete escalation rule',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

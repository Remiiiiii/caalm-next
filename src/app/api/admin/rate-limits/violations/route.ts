/**
 * Admin API endpoint for rate limit violations
 * Get violation details and manage bans
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { penaltyService } from '@/lib/services/rate-limiter-penalties';
import { requirePermission } from '@/lib/rbac/middleware';
import { PERMISSIONS } from '@/constants/permissions';
import { isBanned } from '@/lib/services/redis-rate-limit';

/**
 * GET /api/admin/rate-limits/violations
 * Get violation statistics for an identifier
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions - use AUDIT.VIEW since rate limit monitoring is similar to audit logs
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.AUDIT.VIEW,
    });
    if (permissionCheck) {
      return permissionCheck;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get('identifier');

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier parameter is required' },
        { status: 400 }
      );
    }

    // Get violation stats
    const violationStats = await penaltyService.getViolationStats(identifier);
    const banned = await isBanned(identifier);

    return NextResponse.json({
      success: true,
      data: {
        identifier,
        violationStats,
        banned,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching violation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch violation statistics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rate-limits/violations/reset
 * Reset violations for an identifier
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions - use AUDIT.VIEW since rate limit monitoring is similar to audit logs
    const permissionCheck = await requirePermission(request, {
      permission: PERMISSIONS.AUDIT.VIEW,
    });
    if (permissionCheck) {
      return permissionCheck;
    }

    // Get request body
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 }
      );
    }

    // Reset violations
    await penaltyService.resetViolations(identifier);

    return NextResponse.json({
      success: true,
      message: `Violations reset for identifier: ${identifier}`,
    });
  } catch (error) {
    console.error('Error resetting violations:', error);
    return NextResponse.json(
      { error: 'Failed to reset violations' },
      { status: 500 }
    );
  }
}

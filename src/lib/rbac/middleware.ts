/**
 * Permission Checking Middleware
 * Organization-aware middleware for API routes
 */

import { type NextRequest, NextResponse } from "next/server";
import type { PermissionKey } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	hasAllPermissions,
	hasAnyPermission,
	validateUserOrgAccess,
} from "./permissions";

export interface PermissionMiddlewareOptions {
	permission?: PermissionKey | PermissionKey[];
	requireAll?: boolean; // If multiple permissions, require all (default: any)
	allowSuperAdmin?: boolean; // Allow super admin to bypass (default: true)
}

/**
 * Middleware to check if user has required permission(s)
 */
export async function requirePermission(
	request: NextRequest,
	options: PermissionMiddlewareOptions,
): Promise<NextResponse | null> {
	const user = await getCurrentUser();

	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	// Get orgId from query params or headers
	const orgId =
		request.nextUrl.searchParams.get("orgId") ||
		request.headers.get("x-org-id") ||
		undefined;

	// If orgId provided, validate user belongs to organization
	if (orgId) {
		const hasAccess = await validateUserOrgAccess(user.$id, orgId);
		if (!hasAccess) {
			return NextResponse.json(
				{ error: "Access denied to this organization" },
				{ status: 403 },
			);
		}
	}

	// Check permissions
	if (options.permission) {
		const permissions = Array.isArray(options.permission)
			? options.permission
			: [options.permission];

		const hasRequiredPermission = options.requireAll
			? await hasAllPermissions(user.$id, permissions, orgId)
			: await hasAnyPermission(user.$id, permissions, orgId);

		if (!hasRequiredPermission) {
			return NextResponse.json(
				{ error: "Insufficient permissions" },
				{ status: 403 },
			);
		}
	}

	// All checks passed
	return null;
}

/**
 * Helper to extract orgId from request
 */
export function getOrgIdFromRequest(request: NextRequest): string | undefined {
	return (
		request.nextUrl.searchParams.get("orgId") ||
		request.headers.get("x-org-id") ||
		undefined
	);
}

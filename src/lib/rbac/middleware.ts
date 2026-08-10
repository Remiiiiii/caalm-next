/**
 * Permission Checking Middleware
 * Organization-aware middleware for API routes
 */

import { type NextRequest, NextResponse } from "next/server";
import type { PermissionKey } from "@/constants/permissions";
import { authorize } from "@/lib/rbac/authorize";
import { getCurrentUser } from "@/lib/actions/user.actions";

export interface PermissionMiddlewareOptions {
	permission?: PermissionKey | PermissionKey[];
	requireAll?: boolean; // If multiple permissions, require all (default: any)
	/** When true, reject requests that omit org context */
	requireOrg?: boolean;
}

/**
 * Middleware to check if user has required permission(s).
 * Returns a NextResponse error, or null when authorized.
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

	const orgId =
		request.nextUrl.searchParams.get("orgId") ||
		request.headers.get("x-org-id") ||
		undefined;

	const decision = await authorize({
		userId: user.$id,
		orgId,
		permission: options.permission,
		requireAll: options.requireAll,
		requireOrg: options.requireOrg,
	});

	if (!decision.allowed) {
		const status = decision.reason === "Authentication required" ? 401 : 403;
		return NextResponse.json(
			{ error: decision.reason || "Insufficient permissions" },
			{ status },
		);
	}

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

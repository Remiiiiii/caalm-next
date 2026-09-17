/**
 * Permission Checking Middleware
 * Organization-aware middleware for API routes
 */

import { type NextRequest, NextResponse } from "next/server";
import type { PermissionKey } from "@/constants/permissions";
import { getEffectiveUser } from "@/lib/impersonation/effective-user";
import {
	IMPERSONATION_READ_ONLY_ERROR,
	isImpersonationControlPath,
	shouldBlockImpersonationMutation,
} from "@/lib/impersonation/mutation-guard";
import { authorize } from "@/lib/rbac/authorize";

export interface PermissionMiddlewareOptions {
	permission?: PermissionKey | PermissionKey[];
	requireAll?: boolean; // If multiple permissions, require all (default: any)
	/** When true, reject requests that omit org context */
	requireOrg?: boolean;
	/**
	 * Authorize the signed-in actor instead of the impersonation target.
	 * Use for start/end/status-style controls. Default: target while View as is active.
	 */
	useActor?: boolean;
}

/**
 * Middleware to check if user has required permission(s).
 * Returns a NextResponse error, or null when authorized.
 *
 * While View as user is active, product routes authorize as the target.
 * Mutating methods are blocked (Phase 1 read-only) except impersonation controls.
 */
export async function requirePermission(
	request: NextRequest,
	options: PermissionMiddlewareOptions,
): Promise<NextResponse | null> {
	const context = await getEffectiveUser(request);

	if (!context) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const pathname = request.nextUrl.pathname;
	const useActor =
		options.useActor === true || isImpersonationControlPath(pathname);
	const user = useActor ? context.actor : context.effectiveUser;

	if (
		shouldBlockImpersonationMutation(
			request.method,
			pathname,
			Boolean(context.impersonation),
		)
	) {
		return NextResponse.json(
			{
				error: IMPERSONATION_READ_ONLY_ERROR,
				code: "IMPERSONATION_READ_ONLY",
			},
			{ status: 403 },
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

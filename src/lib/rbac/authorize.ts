/**
 * Central Policy Decision Point (PDP) for CAALM authorization.
 * All API routes, server pages, and server actions should prefer this over ad-hoc checks.
 */

import type { PermissionKey } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getUserDefaultOrganization,
	getUserPermissions,
	validateUserOrgAccess,
} from "@/lib/rbac/permissions";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";

export type AuthorizeDecision = {
	allowed: boolean;
	reason?: string;
	userId?: string;
	orgId?: string;
	permissions?: PermissionKey[];
};

export type AuthorizeInput = {
	userId: string;
	orgId?: string;
	/** Require any of these (default) or all when requireAll is true */
	permission?: PermissionKey | PermissionKey[];
	requireAll?: boolean;
	/** When true, orgId must be provided and membership validated */
	requireOrg?: boolean;
};

/**
 * Evaluate whether a user may perform an action in an org context.
 * Deny by default when permissions are required and none match.
 */
export async function authorize(
	input: AuthorizeInput,
): Promise<AuthorizeDecision> {
	const { userId, permission, requireAll = false, requireOrg = false } = input;

	if (!userId) {
		return { allowed: false, reason: "Authentication required" };
	}

	let orgId = input.orgId;
	if (!orgId) {
		const defaultOrg = await getUserDefaultOrganization(userId);
		orgId = defaultOrg?.orgId;
	}

	if (requireOrg && !orgId) {
		return { allowed: false, reason: "Organization context required", userId };
	}

	if (orgId) {
		const member = await validateUserOrgAccess(userId, orgId);
		if (!member) {
			return {
				allowed: false,
				reason: "Access denied to this organization",
				userId,
				orgId,
			};
		}
	}

	if (!permission) {
		return { allowed: true, userId, orgId };
	}

	const required = Array.isArray(permission) ? permission : [permission];
	if (required.length === 0) {
		return { allowed: true, userId, orgId };
	}

	const held = await getUserPermissions(userId, orgId);
	const ok = requireAll
		? required.every((key) => permissionSatisfied(held, key))
		: required.some((key) => permissionSatisfied(held, key));

	if (!ok) {
		return {
			allowed: false,
			reason: "Insufficient permissions",
			userId,
			orgId,
			permissions: held,
		};
	}

	return { allowed: true, userId, orgId, permissions: held };
}

/**
 * Authorize the current session user (convenience for server components / routes).
 */
export async function authorizeCurrentUser(
	input: Omit<AuthorizeInput, "userId">,
): Promise<AuthorizeDecision & { user?: Awaited<ReturnType<typeof getCurrentUser>> }> {
	const user = await getCurrentUser();
	if (!user) {
		return { allowed: false, reason: "Authentication required" };
	}
	const decision = await authorize({ ...input, userId: user.$id });
	return { ...decision, user };
}

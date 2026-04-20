/**
 * Organization Context Middleware
 * Extracts and validates orgId from requests
 */

import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getUserDefaultOrganization,
	validateUserOrgAccess,
} from "@/lib/rbac/permissions";

export interface OrgContext {
	orgId: string;
	userId: string;
	isValid: boolean;
}

/**
 * Extract and validate organization context from request
 */
export async function getOrgContext(
	request: NextRequest,
): Promise<OrgContext | null> {
	const user = await getCurrentUser();

	if (!user) {
		return null;
	}

	// Try to get orgId from various sources
	let orgId =
		request.nextUrl.searchParams.get("orgId") ||
		request.headers.get("x-org-id") ||
		undefined;

	// If no orgId provided, use user's default organization
	if (!orgId) {
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return null;
		}
		orgId = defaultOrg.orgId;
	}

	// Validate user belongs to organization
	const isValid = await validateUserOrgAccess(user.$id, orgId);

	if (!isValid) {
		return null;
	}

	return {
		orgId,
		userId: user.$id,
		isValid: true,
	};
}

/**
 * Build query with organization filter
 */
export function buildOrgQuery(orgId: string, ...queries: any[]) {
	return [{ method: "equal", attribute: "orgId", value: orgId }, ...queries];
}

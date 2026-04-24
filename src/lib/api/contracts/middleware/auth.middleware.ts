import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { PERMISSIONS } from "@/constants/permissions";
import {
	forbiddenResponse,
	unauthorizedResponse,
} from "../utils/response.util";
import {
	getUserDefaultOrganization,
	hasPermission,
} from "@/lib/rbac/permissions";

/**
 * Require user to be authenticated
 * Returns null if authenticated, or an error response if not
 */
export async function requireAuth(
	_request: NextRequest,
): Promise<ReturnType<typeof unauthorizedResponse> | null> {
	try {
		const user = await getCurrentUser();

		if (!user) {
			return unauthorizedResponse("Authentication required");
		}

		return null;
	} catch (error) {
		console.error("Error in requireAuth middleware:", error);
		return unauthorizedResponse("Authentication failed");
	}
}

/**
 * Require user to own the resource (ownerId matches authenticated user)
 * Returns null if authorized, or an error response if not
 */
export async function requireOwnerAccess(
	_request: NextRequest,
	ownerId: string | null | undefined,
): Promise<ReturnType<typeof forbiddenResponse> | null> {
	const user = await getCurrentUser();

	if (!user) {
		return unauthorizedResponse("Authentication required");
	}

	if (!ownerId) {
		return forbiddenResponse("Resource owner ID is required");
	}

	// Check if ownerId matches user's $id or accountId
	if (ownerId !== user.$id && ownerId !== user.accountId) {
		return forbiddenResponse("Access denied: You do not own this resource");
	}

	return null;
}

/**
 * Require user to have specific contract permission
 * Returns null if authorized, or an error response if not
 */
const ACTION_TO_PERMISSION = {
	read: PERMISSIONS.CONTRACTS.VIEW,
	create: PERMISSIONS.CONTRACTS.CREATE,
	update: PERMISSIONS.CONTRACTS.EDIT,
	delete: PERMISSIONS.CONTRACTS.EDIT,
} as const;

export async function requireContractPermission(
	request: NextRequest,
	action: "read" | "create" | "update" | "delete",
): Promise<ReturnType<typeof forbiddenResponse> | null> {
	const user = await getCurrentUser();

	if (!user) {
		return unauthorizedResponse("Authentication required");
	}

	const orgId =
		request.nextUrl.searchParams.get("orgId") ||
		(await getUserDefaultOrganization(user.$id))?.orgId;

	if (!orgId) {
		return forbiddenResponse("Organization context required");
	}

	const key = ACTION_TO_PERMISSION[action];
	const allowed = await hasPermission(user.$id, key, orgId);

	if (!allowed) {
		return forbiddenResponse(`Permission denied: ${action} contract`);
	}

	return null;
}

/**
 * Combined middleware: require auth and owner access
 */
export async function requireAuthAndOwner(
	request: NextRequest,
	ownerId: string | null | undefined,
): Promise<
	| ReturnType<typeof unauthorizedResponse>
	| ReturnType<typeof forbiddenResponse>
	| null
> {
	const authError = await requireAuth(request);
	if (authError) return authError;

	const ownerError = await requireOwnerAccess(request, ownerId);
	if (ownerError) return ownerError;

	return null;
}

import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	forbiddenResponse,
	unauthorizedResponse,
} from "../utils/response.util";

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
export async function requireContractPermission(
	_request: NextRequest,
	_action: "read" | "create" | "update" | "delete",
): Promise<ReturnType<typeof forbiddenResponse> | null> {
	const user = await getCurrentUser();

	if (!user) {
		return unauthorizedResponse("Authentication required");
	}

	// TODO: Implement RBAC permission checks
	// For now, allow all authenticated users
	// This should be replaced with actual permission checks
	// const hasPermission = await checkContractPermission(user.$id, action);
	// if (!hasPermission) {
	//   return forbiddenResponse(`Permission denied: ${action} contract`);
	// }

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

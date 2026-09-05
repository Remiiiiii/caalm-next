/**
 * Row-level style contract list scoping from permissions + user attributes.
 * Uses contracts.view_* scopes (not calendar proxies).
 */

import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserById } from "@/lib/actions/user.actions";
import { hasPermission } from "@/lib/rbac/permissions";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";

export type ContractListScope =
	| { mode: "all_org" }
	| { mode: "department"; department: string }
	| { mode: "own"; userId: string };

/**
 * Decide how broadly the user may list contracts.
 */
export async function getContractListScope(
	userId: string,
	orgId: string,
): Promise<ContractListScope> {
	const viewAll =
		(await hasPermission(
			userId,
			PERMISSIONS.CONTRACTS.VIEW_ALL,
			orgId,
		)) ||
		(await hasPermission(userId, PERMISSIONS.CONTRACTS.REVIEW, orgId)) ||
		(await hasPermission(userId, PERMISSIONS.CONTRACTS.APPROVE, orgId)) ||
		(await hasPermission(userId, PERMISSIONS.APPROVALS.OVERRIDE, orgId));

	if (viewAll) {
		return { mode: "all_org" };
	}

	const team = await hasPermission(
		userId,
		PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
		orgId,
	);

	if (team) {
		const user = await getUserById(userId);
		const department =
			(user as { department?: string } | null)?.department?.trim() || "";
		if (department) {
			return { mode: "department", department };
		}
	}

	return { mode: "own", userId };
}

/**
 * Appwrite query fragments for contract listRows (AND).
 */
export function buildContractQueries(scope: ContractListScope) {
	const hidden = excludeSoftDeletedQuery();
	switch (scope.mode) {
		case "all_org":
			return [hidden];
		case "department":
			return [
				hidden,
				Query.or([
					Query.equal("department", scope.department),
					Query.equal("assignToDepartment", scope.department),
				]),
			];
		case "own":
			return [
				hidden,
				Query.or([
					Query.equal("contractOwnerId", scope.userId),
					Query.equal("ownerId", scope.userId),
				]),
			];
		default:
			return [hidden];
	}
}

/**
 * Row-level style contract list scoping from permissions + user attributes.
 * Uses contracts.view_* scopes (not calendar proxies).
 *
 * Every mode includes orgId so "view all" never means "all tenants".
 */

import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserById } from "@/lib/actions/user.actions";
import { hasPermission } from "@/lib/rbac/permissions";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";

export type ContractListScope =
	| { mode: "all_org"; orgId: string }
	| { mode: "department"; department: string; orgId: string }
	| { mode: "own"; userId: string; orgId: string };

/**
 * Decide how broadly the user may list contracts within their workspace.
 */
export async function getContractListScope(
	userId: string,
	orgId: string,
): Promise<ContractListScope> {
	const viewAll =
		(await hasPermission(userId, PERMISSIONS.CONTRACTS.VIEW_ALL, orgId)) ||
		(await hasPermission(userId, PERMISSIONS.CONTRACTS.REVIEW, orgId)) ||
		(await hasPermission(userId, PERMISSIONS.CONTRACTS.APPROVE, orgId)) ||
		(await hasPermission(userId, PERMISSIONS.APPROVALS.OVERRIDE, orgId));

	if (viewAll) {
		return { mode: "all_org", orgId };
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
			return { mode: "department", department, orgId };
		}
	}

	return { mode: "own", userId, orgId };
}

/**
 * Appwrite query fragments for contract listRows (AND).
 * Always includes orgId — including all_org (view-all inside one workspace).
 */
export function buildContractQueries(scope: ContractListScope) {
	const hidden = excludeSoftDeletedQuery();
	const orgFilter = Query.equal("orgId", scope.orgId);
	switch (scope.mode) {
		case "all_org":
			return [hidden, orgFilter];
		case "department":
			return [
				hidden,
				orgFilter,
				Query.or([
					Query.equal("department", scope.department),
					Query.equal("assignToDepartment", scope.department),
				]),
			];
		case "own":
			return [
				hidden,
				orgFilter,
				Query.or([
					Query.equal("contractOwnerId", scope.userId),
					Query.equal("ownerId", scope.userId),
				]),
			];
		default:
			return [hidden, orgFilter];
	}
}

/**
 * Decide whether a caller may read IT hub data for a target org.
 * Membership uses the home-org permission set; cross-org needs
 * platform.view_all_orgs in the home org (never a role-name check).
 */
export type ITHubAccessFailure = {
	ok: false;
	status: 401 | 400 | 403 | 404;
	error: string;
};

export type ITHubAccessSuccess = {
	ok: true;
	isPlatformCrossOrg: boolean;
};

export type ITHubAccessResult = ITHubAccessFailure | ITHubAccessSuccess;

export function interpretITHubAccess(input: {
	authenticated: boolean;
	targetOrgId?: string;
	isMember: boolean;
	memberAllowed: boolean;
	platformAllowed: boolean;
}): ITHubAccessResult {
	if (!input.authenticated) {
		return { ok: false, status: 401, error: "Authentication required" };
	}
	if (!input.targetOrgId) {
		return {
			ok: false,
			status: 400,
			error: "Organization context required",
		};
	}
	if (input.isMember) {
		if (!input.memberAllowed) {
			return {
				ok: false,
				status: 403,
				error: "Insufficient permissions",
			};
		}
		return { ok: true, isPlatformCrossOrg: false };
	}
	if (!input.platformAllowed) {
		return {
			ok: false,
			status: 403,
			error: "Access denied to this organization",
		};
	}
	return { ok: true, isPlatformCrossOrg: true };
}

export function interpretITHubFleetAccess(input: {
	authenticated: boolean;
	platformAllowed: boolean;
}): ITHubAccessResult {
	if (!input.authenticated) {
		return { ok: false, status: 401, error: "Authentication required" };
	}
	if (!input.platformAllowed) {
		return {
			ok: false,
			status: 403,
			error: "Insufficient permissions",
		};
	}
	return { ok: true, isPlatformCrossOrg: true };
}

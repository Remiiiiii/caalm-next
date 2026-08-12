/**
 * Division / department pair validation for CAALM product language.
 * CAALM: division = program leaf; department = parent.
 * SCIM map: scim.division ← department; scim.department ← division.
 */

import {
	CONTRACT_DEPARTMENTS,
	DIVISION_TO_DEPARTMENT,
	USER_DIVISIONS,
	type UserDivision,
} from "../../../constants";

export class OrgUnitValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OrgUnitValidationError";
	}
}

export type NormalizedOrgPlacement = {
	department: string;
	division?: string;
};

const KNOWN_DIVISIONS = new Set<string>(USER_DIVISIONS);
const KNOWN_DEPARTMENTS = new Set<string>(CONTRACT_DEPARTMENTS);

export function isKnownDivision(value: string): value is UserDivision {
	return KNOWN_DIVISIONS.has(value);
}

export function isKnownDepartment(value: string): boolean {
	return KNOWN_DEPARTMENTS.has(value);
}

/**
 * Normalize and validate division/department for writes.
 * When division is a known bootstrap slug, department must match DIVISION_TO_DEPARTMENT
 * (or is derived if omitted). Custom (non-bootstrap) pairs pass through when both present.
 */
export function normalizeOrgPlacement(input: {
	department?: string | null;
	division?: string | null;
	requireDepartment?: boolean;
}): NormalizedOrgPlacement {
	const requireDepartment = input.requireDepartment !== false;
	const division = input.division?.trim() || undefined;
	let department = input.department?.trim() || undefined;

	if (division && isKnownDivision(division)) {
		const expected = DIVISION_TO_DEPARTMENT[division];
		if (department && department !== expected) {
			throw new OrgUnitValidationError(
				`Division "${division}" belongs under department "${expected}", not "${department}".`,
			);
		}
		department = expected;
	}

	if (requireDepartment && !department) {
		throw new OrgUnitValidationError("Department is required.");
	}

	return {
		department: department || "",
		...(division ? { division } : {}),
	};
}

/** SCIM enterprise User naming relative to CAALM fields. */
export function toScimEnterpriseOrgFields(user: {
	department?: string | null;
	division?: string | null;
	orgId?: string | null;
	orgName?: string | null;
	managerUserId?: string | null;
	costCenterCode?: string | null;
}) {
	return {
		organization: user.orgName || user.orgId || null,
		/** SCIM "division" = CAALM parent department */
		division: user.department || null,
		/** SCIM "department" = CAALM program/division leaf */
		department: user.division || null,
		costCenter: user.costCenterCode || null,
		manager: user.managerUserId
			? { value: user.managerUserId }
			: null,
	};
}

export function pairsMismatch(
	department: string | null | undefined,
	division: string | null | undefined,
): boolean {
	const div = division?.trim();
	const dept = department?.trim();
	if (!div || !isKnownDivision(div) || !dept) return false;
	return DIVISION_TO_DEPARTMENT[div] !== dept;
}

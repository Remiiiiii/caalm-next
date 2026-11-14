import {
	CONTRACT_DEPARTMENTS,
	formatDepartmentName,
	formatDivisionName,
	USER_DIVISIONS,
	type ContractDepartment,
	type UserDivision,
} from "../../../constants";

/** Turn stored division/department slugs into human labels. */
export function formatOrgLabel(raw: unknown): string {
	if (raw === undefined || raw === null || raw === "") return "";
	const s = String(raw).trim();
	if (!s) return "";
	if (USER_DIVISIONS.includes(s as UserDivision)) {
		return formatDivisionName(s as UserDivision);
	}
	if ((CONTRACT_DEPARTMENTS as readonly string[]).includes(s)) {
		return formatDepartmentName(s as ContractDepartment);
	}
	return s
		.split(/[-_]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}
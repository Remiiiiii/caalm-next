/**
 * IT portal membership is by department field, not by role name.
 * Org Admins often hold IT.* permissions for other admin tools — that alone
 * must not open /dashboard/it.
 */

export type DepartmentProfileFields = {
	department?: string | null;
	departmentLabel?: string | null;
};

/** True when department or departmentLabel is IT (case-insensitive). */
export function isITDepartment(profile: DepartmentProfileFields): boolean {
	const values = [profile.department, profile.departmentLabel]
		.map((v) => String(v || "").trim().toLowerCase())
		.filter(Boolean);
	return values.some((v) => v === "it");
}

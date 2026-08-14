import {
	formatDivisionName,
	getParentDepartment,
	USER_DIVISIONS,
	type UserDivision,
} from "../../../constants";

export type SubmitterPlacementInput = {
	departmentLabel?: string | null;
	department?: string | null;
	divisionLabel?: string | null;
	division?: string | null;
};

function cleanLabel(value?: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed || trimmed === "null") return null;
	return trimmed;
}

export function resolveSubmitterDepartmentLabel(
	input: SubmitterPlacementInput,
): string {
	const departmentLabel = cleanLabel(input.departmentLabel);
	if (departmentLabel) return departmentLabel;

	const department = cleanLabel(input.department);
	if (department) return department;

	const divisionLabel = cleanLabel(input.divisionLabel);
	if (divisionLabel) return divisionLabel;

	const division = cleanLabel(input.division);
	if (!division) return "Not assigned";

	if (USER_DIVISIONS.includes(division as UserDivision)) {
		const d = division as UserDivision;
		return `${getParentDepartment(d)} · ${formatDivisionName(d)}`;
	}

	return division;
}

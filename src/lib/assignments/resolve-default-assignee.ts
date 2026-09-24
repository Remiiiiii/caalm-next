/**
 * Always pick someone for Assigned To.
 * Prefer the division, then the department, then any org manager, then the uploader.
 * That way an empty Sales / Legal team cannot leave a contract ownerless.
 */

export type AssigneeCandidate = {
	$id: string;
	fullName?: string;
	email?: string;
	division?: string;
};

export type AssigneeSource =
	| "selected"
	| "division"
	| "department"
	| "org"
	| "uploader";

export type AssigneePick = {
	ids: string[];
	managers: AssigneeCandidate[];
	source: AssigneeSource;
};

const cleanIds = (ids: unknown): string[] =>
	Array.isArray(ids)
		? ids.filter(
				(id): id is string => typeof id === "string" && id.trim().length > 0,
			)
		: [];

export function pickAssigneeIds(input: {
	selectedIds?: unknown;
	divisionCandidates?: AssigneeCandidate[];
	departmentCandidates?: AssigneeCandidate[];
	orgCandidates?: AssigneeCandidate[];
	fallbackUser?: AssigneeCandidate;
	division?: string;
}): AssigneePick {
	const selected = cleanIds(input.selectedIds);
	if (selected.length > 0) {
		return { ids: selected, managers: [], source: "selected" };
	}

	const division = input.division?.trim() || "";
	const inDivision = (input.divisionCandidates || []).filter(
		(person) =>
			division && person.division && person.division.toLowerCase() === division.toLowerCase(),
	);
	if (inDivision.length > 0) {
		return {
			ids: [inDivision[0].$id],
			managers: inDivision,
			source: "division",
		};
	}

	const departmentPeople = input.departmentCandidates || [];
	if (departmentPeople.length > 0) {
		return {
			ids: [departmentPeople[0].$id],
			managers: departmentPeople,
			source: "department",
		};
	}

	const orgPeople = input.orgCandidates || [];
	if (orgPeople.length > 0) {
		return {
			ids: [orgPeople[0].$id],
			managers: orgPeople,
			source: "org",
		};
	}

	if (input.fallbackUser?.$id) {
		return {
			ids: [input.fallbackUser.$id],
			managers: [input.fallbackUser],
			source: "uploader",
		};
	}

	return { ids: [], managers: [], source: "uploader" };
}

export function assigneeFallbackMessage(
	source: AssigneeSource,
	name?: string,
): string | null {
	if (source === "selected" || source === "division") return null;
	const who = name?.trim() ? ` ${name.trim()}` : "";
	if (source === "department") {
		return `No one is assigned to this division. Defaulting to${who || " the department manager"}.`;
	}
	if (source === "org") {
		return `No one is assigned to this department or division. Defaulting to${who || " an organization manager"} so the record always has an owner.`;
	}
	return `No managers found for this department or division. Defaulting to you so the record always has an owner.`;
}

/** Server path: fill Assigned To when the form or CRM payload left it empty. */
export async function resolveAssignedManagerIds(params: {
	assignedManagerIds?: unknown;
	department?: string | null;
	division?: string | null;
	orgId?: string;
	fallbackUserId?: string;
}): Promise<string[]> {
	const selected = cleanIds(params.assignedManagerIds);
	if (selected.length > 0) return selected;

	const { getAllManagers, getManagersByDepartment, getManagersByDivision } =
		await import("@/lib/utils/get-users-by-role");

	const division = params.division?.trim() || "";
	const department = params.department?.trim() || "";

	const [divisionManagers, departmentManagers, orgManagers] = await Promise.all([
		division ? getManagersByDivision(division, params.orgId) : Promise.resolve([]),
		department
			? getManagersByDepartment(department, params.orgId)
			: Promise.resolve([]),
		getAllManagers(params.orgId),
	]);

	const pick = pickAssigneeIds({
		divisionCandidates: divisionManagers,
		departmentCandidates: departmentManagers,
		orgCandidates: orgManagers,
		fallbackUser: params.fallbackUserId
			? { $id: params.fallbackUserId, fullName: "Uploader" }
			: undefined,
		division,
	});

	if (pick.ids.length === 0) {
		throw new Error(
			"Assigned To is required. No default assignee could be resolved.",
		);
	}

	return pick.ids;
}

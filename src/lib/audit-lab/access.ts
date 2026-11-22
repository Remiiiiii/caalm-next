import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import type { SessionParticipant } from "./types";

export type LabScope = { kind: "org" } | { kind: "departments"; names: string[] };

export type LabCapabilities = {
	scope: LabScope;
	canCreateSession: boolean;
	canEditScript: boolean;
	canManageEvidence: boolean;
	canCoordinateEvidence: boolean;
	canRunPractice: boolean;
	canScorePractice: boolean;
	canPublishReports: boolean;
	canViewPracticePii: boolean;
	canManagePracticeMedia: boolean;
	readOnly: boolean;
};

function has(permissions: string[], key: PermissionKey): boolean {
	return permissions.includes(key);
}

/** Maps audit_lab.* keys to spec §1 actions (no role-name bypasses). */
export function resolveLabCapabilities(input: {
	permissions: string[];
	departmentNames?: string[];
}): LabCapabilities {
	const { permissions } = input;
	const view = has(permissions, PERMISSIONS.AUDIT_LAB.VIEW);
	const manageSessions = has(permissions, PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS);
	const manageEvidence = has(permissions, PERMISSIONS.AUDIT_LAB.MANAGE_EVIDENCE);
	const coordinateEvidence = has(
		permissions,
		PERMISSIONS.AUDIT_LAB.COORDINATE_EVIDENCE,
	);
	const runPractice = has(permissions, PERMISSIONS.AUDIT_LAB.RUN_PRACTICE);
	const scorePractice = has(permissions, PERMISSIONS.AUDIT_LAB.SCORE_PRACTICE);
	const publishReports = has(permissions, PERMISSIONS.AUDIT_LAB.PUBLISH_REPORTS);
	const viewPracticePii = has(
		permissions,
		PERMISSIONS.AUDIT_LAB.VIEW_PRACTICE_PII,
	);
	const managePracticeMedia = has(
		permissions,
		PERMISSIONS.AUDIT_LAB.MANAGE_PRACTICE_MEDIA,
	);

	const fullOrg =
		manageSessions || manageEvidence || coordinateEvidence || publishReports;
	const deptNames = (input.departmentNames ?? []).filter(Boolean);
	const scope: LabScope =
		fullOrg || deptNames.length === 0
			? { kind: "org" }
			: { kind: "departments", names: deptNames };

	const canMutate = view && (manageSessions || manageEvidence || coordinateEvidence);

	return {
		scope,
		canCreateSession: manageSessions,
		canEditScript: manageSessions,
		canManageEvidence: manageEvidence || coordinateEvidence,
		canCoordinateEvidence: coordinateEvidence,
		canRunPractice: runPractice,
		canScorePractice: scorePractice || manageSessions,
		canPublishReports: publishReports || manageSessions,
		canViewPracticePii: viewPracticePii,
		canManagePracticeMedia: managePracticeMedia || manageSessions,
		readOnly: view && !canMutate && !runPractice,
	};
}

/**
 * Who has in-call authority (pause/resume/end/rubric override) — a role on
 * this attempt's roster, distinct from `LabCapabilities`, which governs
 * feature access rather than authority within a live session.
 */
export function isSessionFacilitator(
	participants: SessionParticipant[],
	userId: string,
	createdByUserId?: string,
): boolean {
	const explicit = participants.find((p) => p.role === "facilitator");
	if (explicit) return explicit.userId === userId;
	return Boolean(createdByUserId) && createdByUserId === userId;
}

export function sessionInScope(
	sessionDepartment: string | undefined,
	scope: LabScope,
): boolean {
	if (scope.kind === "org") return true;
	if (!sessionDepartment) return false;
	return scope.names.some(
		(d) => d.toLowerCase() === sessionDepartment.toLowerCase(),
	);
}
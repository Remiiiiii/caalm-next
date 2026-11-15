export const SESSION_STATUSES = [
	"draft",
	"scheduled",
	"prep",
	"in_progress",
	"completed",
	"report_ready",
	"archived",
	"cancelled",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_ROLES = [
	"facilitator",
	"mock_auditor",
	"interviewee",
	"observer",
] as const;

export type SessionRole = (typeof SESSION_ROLES)[number];

export const EVIDENCE_STATUSES = [
	"not_started",
	"in_progress",
	"internal_review",
	"submitted",
	"follow_up",
	"accepted",
	"rejected",
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export type SessionParticipant = {
	userId: string;
	name?: string;
	email?: string;
	role: SessionRole;
};

export type ReviewSession = {
	$id: string;
	orgId: string;
	title: string;
	department: string;
	framework?: string;
	scheduledAt?: string;
	durationMinutes: number;
	status: SessionStatus;
	participantsJson: string;
	createdByUserId: string;
	$createdAt?: string;
	$updatedAt?: string;
};

export type ReviewQuestion = {
	$id: string;
	orgId: string;
	sessionId: string;
	prompt: string;
	source: string;
	sourceFindingId?: string;
	difficulty: string;
	rubric?: string;
	createdByUserId: string;
};

export type ReviewScript = {
	$id: string;
	orgId: string;
	sessionId: string;
	version: number;
	itemsJson: string;
	createdByUserId: string;
};

export type ReviewAttempt = {
	$id: string;
	orgId: string;
	sessionId: string;
	intervieweeUserId: string;
	persona: string;
	difficulty: string;
	transcriptJson: string;
	scoresJson: string;
	status: string;
	createdByUserId: string;
};

export type ReviewGap = {
	$id: string;
	orgId: string;
	sessionId: string;
	attemptId?: string;
	description: string;
	capId?: string;
	status: string;
};

export type EvidenceRequest = {
	$id: string;
	orgId: string;
	sessionId: string;
	title: string;
	controlRef?: string;
	department?: string;
	ownerUserId?: string;
	managerUserId?: string;
	assigneeUserId?: string;
	status: EvidenceStatus;
	dueAt?: string;
	sensitive?: boolean;
};

export type ReviewReport = {
	$id: string;
	orgId: string;
	sessionId?: string;
	kind: string;
	bodyJson: string;
	createdByUserId: string;
};

export function parseParticipants(json: string | undefined): SessionParticipant[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json) as unknown;
		return Array.isArray(parsed) ? (parsed as SessionParticipant[]) : [];
	} catch {
		return [];
	}
}

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
	"follow_up_requested",
	"resubmitted",
	"accepted",
	"rejected_resubmit",
	"not_applicable",
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

const LEGACY_EVIDENCE: Record<string, EvidenceStatus> = {
	follow_up: "follow_up_requested",
	rejected: "rejected_resubmit",
};

export function normalizeEvidenceStatus(raw: string): EvidenceStatus {
	if ((EVIDENCE_STATUSES as readonly string[]).includes(raw)) {
		return raw as EvidenceStatus;
	}
	return LEGACY_EVIDENCE[raw] ?? "not_started";
}

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
	prepDeadlineAt?: string;
	recurrence?: string;
	departmentsJson?: string;
	timezone?: string;
	readinessSnapshotId?: string;
	/** 0–100 from latest voice practice scorecard; omit until first graded interview. */
	practiceReadinessPct?: number;
	linkedAuditDocIds?: string;
	auditTrailJson?: string;
	calendarEventId?: string;
	aiBannerDismissedSignature?: string;
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
	controlRef?: string;
	createdByUserId: string;
};

export type ReviewScript = {
	$id: string;
	$createdAt?: string;
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
	/** LiveKit room/call id — set once a voice interview starts. */
	callId?: string;
	recordingUrl?: string;
	consentAt?: string;
	/** LiveKit RoomComposite egress id while recording. */
	egressId?: string;
	/** Appwrite file id in the practice recordings bucket. */
	recordingFileId?: string;
	/** PII-redacted transcript JSON (answers/citations scrubbed). */
	transcriptRedactedJson?: string;
	/** Data residency region stamp (e.g. eu, us). */
	dataResidencyRegion?: string;
	/** True when the browser published pitch-shifted mic audio. */
	audioAnonymized?: boolean;
	createdByUserId: string;
};

/** One turn of a voice interview, stored inside `ReviewAttempt.transcriptJson`. */
export type VoiceTranscriptTurn = {
	questionId: string;
	question: string;
	answer: string;
	at: string;
	citedEvidence?: string;
	answerQuality?: "strong" | "adequate" | "weak";
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

export function parseParticipants(
	json: string | undefined,
): SessionParticipant[] {
	if (!json) return [];
	try {
		const parsed = JSON.parse(json) as unknown;
		return Array.isArray(parsed) ? (parsed as SessionParticipant[]) : [];
	} catch {
		return [];
	}
}

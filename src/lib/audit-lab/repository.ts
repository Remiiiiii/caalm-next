import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	AuditLabEvidenceItem,
	AuditLabEvidenceLink,
	EvidenceRequest,
	EvidenceStatus,
	ReviewAttempt,
	ReviewGap,
	ReviewQuestion,
	ReviewReport,
	ReviewScript,
	ReviewSession,
	ReviewSessionParticipantRow,
	ReviewTranscriptTurnRow,
	SessionStatus,
} from "./types";
import { normalizeEvidenceStatus } from "./types";

function mapEvidenceRequest(row: EvidenceRequest): EvidenceRequest {
	return {
		...row,
		status: normalizeEvidenceStatus(String(row.status ?? "")),
	};
}

function dbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

async function tables() {
	const { tablesDB } = await createAdminClient();
	return tablesDB;
}

/**
 * Maps `users` collection row ids (what this app calls "userId" everywhere —
 * roster rows, `createdByUserId`, etc.) to the real Appwrite auth account id.
 * The two differ: Appwrite's realtime/permission system only ever recognizes
 * `Role.user(accountId)`, so a permission grant built from the row id instead
 * never matches the actual connected user. Falls back to the row id itself
 * for any id with no matching row, so a lookup miss degrades to the (still
 * broken, but no worse than before) previous behavior rather than throwing.
 */
export async function resolveAccountIds(
	userIds: string[],
): Promise<Map<string, string>> {
	const unique = [...new Set(userIds)].filter(Boolean);
	const map = new Map<string, string>(unique.map((id) => [id, id]));
	if (unique.length === 0) return map;
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.usersCollectionId || "users",
		queries: [Query.equal("$id", unique), Query.limit(unique.length)],
	});
	for (const row of result.rows as unknown as Array<{
		$id: string;
		accountId?: string;
	}>) {
		if (row.accountId) map.set(row.$id, row.accountId);
	}
	return map;
}

export async function createSessionRow(
	data: Omit<ReviewSession, "$id" | "$createdAt" | "$updatedAt">,
): Promise<ReviewSession> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as ReviewSession;
}

export async function getSession(
	orgId: string,
	sessionId: string,
): Promise<ReviewSession | null> {
	try {
		const tablesDB = await tables();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: appwriteConfig.reviewSessionsCollectionId,
			rowId: sessionId,
		});
		const session = row as unknown as ReviewSession;
		if (session.orgId !== orgId) return null;
		return session;
	} catch {
		return null;
	}
}

export async function listSessions(
	orgId: string,
	limit = 50,
): Promise<ReviewSession[]> {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionsCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.orderDesc("$createdAt"),
			Query.limit(limit),
		],
	});
	return result.rows as unknown as ReviewSession[];
}

export async function updateSessionRow(
	sessionId: string,
	data: Partial<
		Pick<
			ReviewSession,
			| "scheduledAt"
			| "prepDeadlineAt"
			| "status"
			| "participantsJson"
			| "title"
			| "department"
			| "framework"
			| "recurrence"
			| "timezone"
			| "calendarEventId"
			| "aiBannerDismissedSignature"
			| "practiceReadinessPct"
		>
	>,
): Promise<ReviewSession> {
	const tablesDB = await tables();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionsCollectionId,
		rowId: sessionId,
		data,
	});
	return row as unknown as ReviewSession;
}

export async function createQuestionRow(
	data: Omit<ReviewQuestion, "$id">,
): Promise<ReviewQuestion> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewQuestionsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as ReviewQuestion;
}

export async function listQuestions(
	orgId: string,
	sessionId: string,
): Promise<ReviewQuestion[]> {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewQuestionsCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("sessionId", sessionId),
			Query.limit(100),
		],
	});
	return result.rows as unknown as ReviewQuestion[];
}

export async function createScriptRow(
	data: Omit<ReviewScript, "$id">,
): Promise<ReviewScript> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewScriptsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as ReviewScript;
}

export async function listScripts(
	orgId: string,
	sessionId: string,
): Promise<ReviewScript[]> {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewScriptsCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("sessionId", sessionId),
			Query.orderDesc("version"),
			Query.limit(20),
		],
	});
	return result.rows as unknown as ReviewScript[];
}

export async function createAttemptRow(
	data: Omit<ReviewAttempt, "$id">,
): Promise<ReviewAttempt> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewAttemptsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as ReviewAttempt;
}

export async function getAttempt(
	orgId: string,
	attemptId: string,
): Promise<ReviewAttempt | null> {
	try {
		const tablesDB = await tables();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: appwriteConfig.reviewAttemptsCollectionId,
			rowId: attemptId,
		});
		const attempt = row as unknown as ReviewAttempt;
		if (attempt.orgId !== orgId) return null;
		return attempt;
	} catch {
		return null;
	}
}

/**
 * No orgId check — only for trusted server-to-server callers (the voice-agent
 * worker and the LiveKit webhook), which authenticate by shared secret / signed
 * payload instead of a user session and so have no orgId to check against yet.
 */
export async function getAttemptUnscoped(
	attemptId: string,
): Promise<ReviewAttempt | null> {
	try {
		const tablesDB = await tables();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: appwriteConfig.reviewAttemptsCollectionId,
			rowId: attemptId,
		});
		return row as unknown as ReviewAttempt;
	} catch {
		return null;
	}
}

export async function updateAttemptRow(
	attemptId: string,
	data: Partial<
		Pick<
			ReviewAttempt,
			| "transcriptJson"
			| "scoresJson"
			| "status"
			| "callId"
			| "recordingUrl"
			| "consentAt"
			| "egressId"
			| "recordingFileId"
			| "transcriptRedactedJson"
			| "dataResidencyRegion"
			| "audioAnonymized"
			| "currentQuestionId"
			| "pausedAt"
		>
	>,
): Promise<ReviewAttempt> {
	const tablesDB = await tables();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewAttemptsCollectionId,
		rowId: attemptId,
		data,
	});
	return row as unknown as ReviewAttempt;
}

export async function createGapRow(
	data: Omit<ReviewGap, "$id">,
): Promise<ReviewGap> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewGapsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as ReviewGap;
}

export async function listGaps(
	orgId: string,
	sessionId?: string,
): Promise<ReviewGap[]> {
	const tablesDB = await tables();
	const queries = [Query.equal("orgId", orgId), Query.limit(100)];
	if (sessionId) queries.push(Query.equal("sessionId", sessionId));
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewGapsCollectionId,
		queries,
	});
	return result.rows as unknown as ReviewGap[];
}

export async function createEvidenceRow(
	data: Omit<EvidenceRequest, "$id">,
): Promise<EvidenceRequest> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.evidenceRequestsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as EvidenceRequest;
}

export async function getEvidence(
	orgId: string,
	requestId: string,
): Promise<EvidenceRequest | null> {
	try {
		const tablesDB = await tables();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: appwriteConfig.evidenceRequestsCollectionId,
			rowId: requestId,
		});
		const item = row as unknown as EvidenceRequest;
		if (item.orgId !== orgId) return null;
		return mapEvidenceRequest(item);
	} catch {
		return null;
	}
}

export async function listEvidence(
	orgId: string,
	sessionId?: string,
): Promise<EvidenceRequest[]> {
	const tablesDB = await tables();
	const queries = [Query.equal("orgId", orgId), Query.limit(200)];
	if (sessionId) queries.push(Query.equal("sessionId", sessionId));
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.evidenceRequestsCollectionId,
		queries,
	});
	return (result.rows as unknown as EvidenceRequest[]).map(mapEvidenceRequest);
}

export async function updateEvidenceRow(
	requestId: string,
	data: Partial<
		Pick<
			EvidenceRequest,
			| "ownerUserId"
			| "managerUserId"
			| "assigneeUserId"
			| "status"
			| "department"
			| "dueAt"
			| "testResult"
		>
	>,
): Promise<EvidenceRequest> {
	const tablesDB = await tables();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: appwriteConfig.evidenceRequestsCollectionId,
		rowId: requestId,
		data,
	});
	return mapEvidenceRequest(row as unknown as EvidenceRequest);
}

export async function listEvidenceStatusLog(orgId: string, limit = 50) {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.evidenceStatusLogCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.orderDesc("$createdAt"),
			Query.limit(limit),
		],
	});
	return result.rows as unknown as Array<{
		$id: string;
		requestId: string;
		toStatus: string;
		actorUserId: string;
		note?: string;
		$createdAt?: string;
	}>;
}

export async function appendEvidenceStatusLog(data: {
	orgId: string;
	requestId: string;
	fromStatus: EvidenceStatus | "";
	toStatus: EvidenceStatus;
	actorUserId: string;
	note?: string;
}): Promise<void> {
	const tablesDB = await tables();
	await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.evidenceStatusLogCollectionId,
		rowId: ID.unique(),
		data,
	});
}

export async function createReportRow(
	data: Omit<ReviewReport, "$id">,
): Promise<ReviewReport> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewReportsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as ReviewReport;
}

export async function listReports(
	orgId: string,
	sessionId?: string,
): Promise<ReviewReport[]> {
	const tablesDB = await tables();
	const queries = [Query.equal("orgId", orgId), Query.limit(50)];
	if (sessionId) queries.push(Query.equal("sessionId", sessionId));
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewReportsCollectionId,
		queries,
	});
	return result.rows as unknown as ReviewReport[];
}

export async function createParticipantRow(
	data: Omit<ReviewSessionParticipantRow, "$id">,
	permissions: string[],
): Promise<ReviewSessionParticipantRow> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionParticipantsCollectionId,
		rowId: ID.unique(),
		data,
		permissions,
	});
	return row as unknown as ReviewSessionParticipantRow;
}

export async function findParticipantRow(
	attemptId: string,
	userId: string,
): Promise<ReviewSessionParticipantRow | null> {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionParticipantsCollectionId,
		queries: [
			Query.equal("attemptId", attemptId),
			Query.equal("userId", userId),
			Query.limit(1),
		],
	});
	return (result.rows[0] as unknown as ReviewSessionParticipantRow) ?? null;
}

export async function listParticipantRows(
	orgId: string,
	attemptId: string,
): Promise<ReviewSessionParticipantRow[]> {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionParticipantsCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("attemptId", attemptId),
			Query.limit(50),
		],
	});
	return result.rows as unknown as ReviewSessionParticipantRow[];
}

export async function updateParticipantRow(
	rowId: string,
	data: Partial<
		Pick<
			ReviewSessionParticipantRow,
			"connectionState" | "micOn" | "camOn" | "joinedAt" | "leftAt" | "role"
		>
	>,
): Promise<ReviewSessionParticipantRow> {
	const tablesDB = await tables();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionParticipantsCollectionId,
		rowId,
		data,
	});
	return row as unknown as ReviewSessionParticipantRow;
}

export async function createTranscriptTurnRow(
	data: Omit<ReviewTranscriptTurnRow, "$id">,
	permissions?: string[],
): Promise<ReviewTranscriptTurnRow> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewTranscriptTurnsCollectionId,
		rowId: ID.unique(),
		data,
		...(permissions ? { permissions } : {}),
	});
	return row as unknown as ReviewTranscriptTurnRow;
}

export async function listTranscriptTurnRows(
	orgId: string,
	attemptId: string,
): Promise<ReviewTranscriptTurnRow[]> {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewTranscriptTurnsCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("attemptId", attemptId),
			Query.orderAsc("$createdAt"),
			Query.limit(1000),
		],
	});
	return result.rows as unknown as ReviewTranscriptTurnRow[];
}

/** Attachment entries share `review_transcript_turns` with spoken turns (one log, one realtime subscription). */
export async function createAttachmentRow(
	data: Omit<ReviewTranscriptTurnRow, "$id">,
	permissions?: string[],
): Promise<ReviewTranscriptTurnRow> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewTranscriptTurnsCollectionId,
		rowId: ID.unique(),
		data,
		...(permissions ? { permissions } : {}),
	});
	return row as unknown as ReviewTranscriptTurnRow;
}

export async function updateAttachmentRow(
	rowId: string,
	patch: Partial<ReviewTranscriptTurnRow>,
): Promise<ReviewTranscriptTurnRow> {
	const tablesDB = await tables();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewTranscriptTurnsCollectionId,
		rowId,
		data: patch,
	});
	return row as unknown as ReviewTranscriptTurnRow;
}

export async function createEvidenceItemRow(
	data: Omit<AuditLabEvidenceItem, "$id">,
): Promise<AuditLabEvidenceItem> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.auditLabEvidenceItemsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as AuditLabEvidenceItem;
}

export async function getEvidenceItem(
	orgId: string,
	itemId: string,
): Promise<AuditLabEvidenceItem | null> {
	try {
		const tablesDB = await tables();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: appwriteConfig.auditLabEvidenceItemsCollectionId,
			rowId: itemId,
		});
		const item = row as unknown as AuditLabEvidenceItem;
		if (item.orgId !== orgId) return null;
		return item;
	} catch {
		return null;
	}
}

export async function getEvidenceLink(
	orgId: string,
	linkId: string,
): Promise<AuditLabEvidenceLink | null> {
	try {
		const tablesDB = await tables();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: appwriteConfig.auditLabEvidenceLinksCollectionId,
			rowId: linkId,
		});
		const link = row as unknown as AuditLabEvidenceLink;
		if (link.orgId !== orgId) return null;
		return link;
	} catch {
		return null;
	}
}

export async function createEvidenceLinkRow(
	data: Omit<AuditLabEvidenceLink, "$id">,
): Promise<AuditLabEvidenceLink> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.auditLabEvidenceLinksCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as AuditLabEvidenceLink;
}

export async function updateEvidenceLinkRow(
	linkId: string,
	data: Partial<Pick<AuditLabEvidenceLink, "aiSuggested" | "confirmedByUserId">>,
): Promise<AuditLabEvidenceLink> {
	const tablesDB = await tables();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: appwriteConfig.auditLabEvidenceLinksCollectionId,
		rowId: linkId,
		data,
	});
	return row as unknown as AuditLabEvidenceLink;
}

export async function listEvidenceLinks(
	orgId: string,
	sessionId: string,
	requirementId?: string,
): Promise<AuditLabEvidenceLink[]> {
	const tablesDB = await tables();
	const queries = [
		Query.equal("orgId", orgId),
		Query.equal("sessionId", sessionId),
		Query.limit(500),
	];
	if (requirementId) queries.push(Query.equal("requirementId", requirementId));
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.auditLabEvidenceLinksCollectionId,
		queries,
	});
	return result.rows as unknown as AuditLabEvidenceLink[];
}

export type { SessionStatus };

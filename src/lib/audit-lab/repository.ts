import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	EvidenceRequest,
	EvidenceStatus,
	ReviewAttempt,
	ReviewGap,
	ReviewQuestion,
	ReviewReport,
	ReviewScript,
	ReviewSession,
	SessionStatus,
} from "./types";

function dbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

async function tables() {
	const { tablesDB } = await createAdminClient();
	return tablesDB;
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
		return item;
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
	return result.rows as unknown as EvidenceRequest[];
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
	return row as unknown as EvidenceRequest;
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

export type { SessionStatus };

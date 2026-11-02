import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	AuditCapRecord,
	AuditCapStatus,
	AuditCitation,
	AuditDocumentRecord,
	AuditDocumentStatus,
	AuditFeedbackRecord,
	AuditFindingRecord,
	AuditFindingStatus,
	ControlDeficiencyType,
	ProcessingLogEntry,
	ReconciliationResult,
} from "./types";

type FindingExtras = {
	findingCode?: string | null;
	managementResponse?: string | null;
	monetaryImpactUsd?: number | null;
	controlDeficiencyType?: ControlDeficiencyType | null;
};

function packCitations(
	citations: AuditCitation[],
	extras: FindingExtras,
): string | null {
	return stringify({ quotes: citations, extras });
}

function unpackCitations(value: unknown): {
	citations: AuditCitation[];
	extras: FindingExtras;
} {
	const parsed = parseJson<unknown>(value, []);
	if (Array.isArray(parsed)) {
		return { citations: parsed as AuditCitation[], extras: {} };
	}
	if (parsed && typeof parsed === "object") {
		const record = parsed as { quotes?: AuditCitation[]; extras?: FindingExtras };
		return {
			citations: Array.isArray(record.quotes) ? record.quotes : [],
			extras: record.extras ?? {},
		};
	}
	return { citations: [], extras: {} };
}

function db() {
	const id = appwriteConfig.databaseId;
	if (!id) throw new Error("Appwrite database is not configured");
	return id;
}

function documentsId() {
	return appwriteConfig.auditDocumentsCollectionId;
}

function findingsId() {
	return appwriteConfig.auditFindingsCollectionId;
}

function capsId() {
	return appwriteConfig.auditCorrectiveActionsCollectionId;
}

function feedbackId() {
	return appwriteConfig.auditFeedbackCollectionId;
}

function parseJson<T>(value: unknown, fallback: T): T {
	if (value == null || value === "") return fallback;
	if (typeof value === "object") return value as T;
	if (typeof value !== "string") return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

function stringify(value: unknown): string | null {
	if (value == null) return null;
	return JSON.stringify(value);
}

export function mapDocument(row: Record<string, unknown>): AuditDocumentRecord {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId),
		uploadedBy: String(row.uploadedBy),
		fileName: String(row.fileName),
		mimeType: String(row.mimeType ?? ""),
		fileSize: Number(row.fileSize ?? 0),
		storageFileId: String(row.storageFileId ?? ""),
		contentHash: String(row.contentHash ?? ""),
		status: String(row.status) as AuditDocumentStatus,
		processingLog: parseJson(row.processingLog, []),
		summary: row.summary ? String(row.summary) : null,
		metadata: parseJson(row.metadata, null),
		errorMessage: row.errorMessage ? String(row.errorMessage) : null,
		deletedAt: row.deletedAt ? String(row.deletedAt) : null,
		$createdAt: row.$createdAt ? String(row.$createdAt) : undefined,
		$updatedAt: row.$updatedAt ? String(row.$updatedAt) : undefined,
	};
}

export function mapFinding(row: Record<string, unknown>): AuditFindingRecord {
	const packed = unpackCitations(row.citations);
	return {
		$id: String(row.$id),
		orgId: String(row.orgId),
		documentId: String(row.documentId),
		title: String(row.title),
		description: String(row.description ?? ""),
		frameworkRefs: parseJson(row.frameworkRefs, []),
		severityReported: (row.severityReported as AuditFindingRecord["severityReported"]) ?? null,
		severityComputed: (row.severityComputed as AuditFindingRecord["severityComputed"]) ?? "medium",
		likelihood: Number(row.likelihood ?? 3),
		impact: Number(row.impact ?? 3),
		riskScore: Number(row.riskScore ?? 9),
		confidence: Number(row.confidence ?? 0.5),
		citations: packed.citations,
		citationCheckPassed: Boolean(row.citationCheckPassed),
		findingCode: packed.extras.findingCode ?? null,
		managementResponse: packed.extras.managementResponse ?? null,
		monetaryImpactUsd:
			packed.extras.monetaryImpactUsd == null
				? null
				: Number(packed.extras.monetaryImpactUsd),
		controlDeficiencyType: packed.extras.controlDeficiencyType ?? null,
		findingKey: String(row.findingKey ?? ""),
		isRepeat: Boolean(row.isRepeat),
		repeatOfFindingId: row.repeatOfFindingId ? String(row.repeatOfFindingId) : null,
		status: String(row.status) as AuditFindingStatus,
		reconciliation: parseJson(row.reconciliation, null),
		disputeReason: row.disputeReason ? String(row.disputeReason) : null,
		riskAcceptanceReason: row.riskAcceptanceReason
			? String(row.riskAcceptanceReason)
			: null,
		riskAcceptedBy: row.riskAcceptedBy ? String(row.riskAcceptedBy) : null,
		riskAcceptedAt: row.riskAcceptedAt ? String(row.riskAcceptedAt) : null,
		$createdAt: row.$createdAt ? String(row.$createdAt) : undefined,
		$updatedAt: row.$updatedAt ? String(row.$updatedAt) : undefined,
	};
}

export function mapCap(row: Record<string, unknown>): AuditCapRecord {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId),
		documentId: String(row.documentId),
		findingId: String(row.findingId),
		title: String(row.title),
		rootCause: String(row.rootCause ?? ""),
		assigneeId: row.assigneeId ? String(row.assigneeId) : null,
		status: String(row.status) as AuditCapStatus,
		dueAt: String(row.dueAt),
		escalationTier: Number(row.escalationTier ?? 0),
		verificationEvidence: row.verificationEvidence
			? String(row.verificationEvidence)
			: null,
		closedAt: row.closedAt ? String(row.closedAt) : null,
		$createdAt: row.$createdAt ? String(row.$createdAt) : undefined,
		$updatedAt: row.$updatedAt ? String(row.$updatedAt) : undefined,
	};
}

export async function findDocumentByHash(
	orgId: string,
	contentHash: string,
): Promise<AuditDocumentRecord | null> {
	const { databases } = await createAdminClient();
	const result = await databases.listDocuments(db(), documentsId(), [
		Query.equal("orgId", orgId),
		Query.equal("contentHash", contentHash),
		Query.limit(5),
	]);
	const mapped = result.documents
		.map((row) => mapDocument(row as unknown as Record<string, unknown>))
		.find((doc) => !doc.deletedAt);
	return mapped ?? null;
}

export async function createAuditDocument(
	data: Omit<AuditDocumentRecord, "$id" | "$createdAt" | "$updatedAt">,
): Promise<AuditDocumentRecord> {
	const { databases } = await createAdminClient();
	const created = await databases.createDocument(db(), documentsId(), ID.unique(), {
		orgId: data.orgId,
		uploadedBy: data.uploadedBy,
		fileName: data.fileName,
		mimeType: data.mimeType,
		fileSize: data.fileSize,
		storageFileId: data.storageFileId,
		contentHash: data.contentHash,
		status: data.status,
		processingLog: stringify(data.processingLog),
		summary: data.summary,
		metadata: stringify(data.metadata),
		errorMessage: data.errorMessage,
		deletedAt: data.deletedAt,
	});
	return mapDocument(created as unknown as Record<string, unknown>);
}

export async function getAuditDocument(
	orgId: string,
	id: string,
): Promise<AuditDocumentRecord | null> {
	const { databases } = await createAdminClient();
	try {
		const row = await databases.getDocument(db(), documentsId(), id);
		const mapped = mapDocument(row as unknown as Record<string, unknown>);
		if (mapped.orgId !== orgId || mapped.deletedAt) return null;
		return mapped;
	} catch {
		return null;
	}
}

export async function listAuditDocuments(
	orgId: string,
	limit = 50,
): Promise<AuditDocumentRecord[]> {
	const { databases } = await createAdminClient();
	const result = await databases.listDocuments(db(), documentsId(), [
		Query.equal("orgId", orgId),
		Query.orderDesc("$createdAt"),
		Query.limit(limit),
	]);
	return result.documents
		.map((row) => mapDocument(row as unknown as Record<string, unknown>))
		.filter((doc) => !doc.deletedAt);
}

export async function updateAuditDocument(
	id: string,
	patch: Partial<
		Pick<
			AuditDocumentRecord,
			"status" | "processingLog" | "summary" | "metadata" | "errorMessage" | "deletedAt"
		>
	>,
): Promise<AuditDocumentRecord> {
	const { databases } = await createAdminClient();
	const data: Record<string, unknown> = {};
	if (patch.status) data.status = patch.status;
	if (patch.processingLog) data.processingLog = stringify(patch.processingLog);
	if (patch.summary !== undefined) data.summary = patch.summary;
	if (patch.metadata !== undefined) data.metadata = stringify(patch.metadata);
	if (patch.errorMessage !== undefined) data.errorMessage = patch.errorMessage;
	if (patch.deletedAt !== undefined) data.deletedAt = patch.deletedAt;
	const updated = await databases.updateDocument(db(), documentsId(), id, data);
	return mapDocument(updated as unknown as Record<string, unknown>);
}

export async function appendProcessingLog(
	id: string,
	current: ProcessingLogEntry[],
	entry: ProcessingLogEntry,
	status?: AuditDocumentStatus,
): Promise<ProcessingLogEntry[]> {
	const next = [...current, entry];
	await updateAuditDocument(id, {
		processingLog: next,
		...(status ? { status } : {}),
	});
	return next;
}

export async function createFinding(
	data: Omit<AuditFindingRecord, "$id" | "$createdAt" | "$updatedAt">,
): Promise<AuditFindingRecord> {
	const { databases } = await createAdminClient();
	const created = await databases.createDocument(db(), findingsId(), ID.unique(), {
		orgId: data.orgId,
		documentId: data.documentId,
		title: data.title,
		description: data.description,
		frameworkRefs: stringify(data.frameworkRefs),
		severityReported: data.severityReported,
		severityComputed: data.severityComputed,
		likelihood: data.likelihood,
		impact: data.impact,
		riskScore: data.riskScore,
		confidence: data.confidence,
		citations: packCitations(data.citations, {
			findingCode: data.findingCode,
			managementResponse: data.managementResponse,
			monetaryImpactUsd: data.monetaryImpactUsd,
			controlDeficiencyType: data.controlDeficiencyType,
		}),
		citationCheckPassed: data.citationCheckPassed,
		findingKey: data.findingKey,
		isRepeat: data.isRepeat,
		repeatOfFindingId: data.repeatOfFindingId,
		status: data.status,
		reconciliation: stringify(data.reconciliation),
		disputeReason: data.disputeReason,
		riskAcceptanceReason: data.riskAcceptanceReason,
		riskAcceptedBy: data.riskAcceptedBy,
		riskAcceptedAt: data.riskAcceptedAt,
	});
	return mapFinding(created as unknown as Record<string, unknown>);
}

export async function getFinding(
	orgId: string,
	id: string,
): Promise<AuditFindingRecord | null> {
	const { databases } = await createAdminClient();
	try {
		const row = await databases.getDocument(db(), findingsId(), id);
		const mapped = mapFinding(row as unknown as Record<string, unknown>);
		return mapped.orgId === orgId ? mapped : null;
	} catch {
		return null;
	}
}

export async function listFindings(filters: {
	orgId: string;
	documentId?: string;
	status?: AuditFindingStatus;
	limit?: number;
}): Promise<AuditFindingRecord[]> {
	const { databases } = await createAdminClient();
	const queries = [
		Query.equal("orgId", filters.orgId),
		Query.orderDesc("$createdAt"),
		Query.limit(filters.limit ?? 100),
	];
	if (filters.documentId) queries.push(Query.equal("documentId", filters.documentId));
	if (filters.status) queries.push(Query.equal("status", filters.status));
	const result = await databases.listDocuments(db(), findingsId(), queries);
	return result.documents.map((row) =>
		mapFinding(row as unknown as Record<string, unknown>),
	);
}

export async function updateFinding(
	id: string,
	patch: Partial<
		Pick<
			AuditFindingRecord,
			| "status"
			| "reconciliation"
			| "disputeReason"
			| "riskAcceptanceReason"
			| "riskAcceptedBy"
			| "riskAcceptedAt"
		>
	>,
): Promise<AuditFindingRecord> {
	const { databases } = await createAdminClient();
	const data: Record<string, unknown> = {};
	if (patch.status) data.status = patch.status;
	if (patch.reconciliation !== undefined) {
		data.reconciliation = stringify(patch.reconciliation);
	}
	if (patch.disputeReason !== undefined) data.disputeReason = patch.disputeReason;
	if (patch.riskAcceptanceReason !== undefined) {
		data.riskAcceptanceReason = patch.riskAcceptanceReason;
	}
	if (patch.riskAcceptedBy !== undefined) data.riskAcceptedBy = patch.riskAcceptedBy;
	if (patch.riskAcceptedAt !== undefined) data.riskAcceptedAt = patch.riskAcceptedAt;
	const updated = await databases.updateDocument(db(), findingsId(), id, data);
	return mapFinding(updated as unknown as Record<string, unknown>);
}

export async function createCap(
	data: Omit<AuditCapRecord, "$id" | "$createdAt" | "$updatedAt">,
): Promise<AuditCapRecord> {
	const { databases } = await createAdminClient();
	const created = await databases.createDocument(db(), capsId(), ID.unique(), {
		orgId: data.orgId,
		documentId: data.documentId,
		findingId: data.findingId,
		title: data.title,
		rootCause: data.rootCause,
		assigneeId: data.assigneeId,
		status: data.status,
		dueAt: data.dueAt,
		escalationTier: data.escalationTier,
		verificationEvidence: data.verificationEvidence,
		closedAt: data.closedAt,
	});
	return mapCap(created as unknown as Record<string, unknown>);
}

export async function getCap(
	orgId: string,
	id: string,
): Promise<AuditCapRecord | null> {
	const { databases } = await createAdminClient();
	try {
		const row = await databases.getDocument(db(), capsId(), id);
		const mapped = mapCap(row as unknown as Record<string, unknown>);
		return mapped.orgId === orgId ? mapped : null;
	} catch {
		return null;
	}
}

export async function listCaps(filters: {
	orgId: string;
	documentId?: string;
	status?: AuditCapStatus;
	limit?: number;
}): Promise<AuditCapRecord[]> {
	const { databases } = await createAdminClient();
	const queries = [
		Query.equal("orgId", filters.orgId),
		Query.orderDesc("$createdAt"),
		Query.limit(filters.limit ?? 200),
	];
	if (filters.documentId) queries.push(Query.equal("documentId", filters.documentId));
	if (filters.status) queries.push(Query.equal("status", filters.status));
	const result = await databases.listDocuments(db(), capsId(), queries);
	return result.documents.map((row) =>
		mapCap(row as unknown as Record<string, unknown>),
	);
}

export async function updateCap(
	id: string,
	patch: Partial<
		Pick<
			AuditCapRecord,
			| "assigneeId"
			| "status"
			| "dueAt"
			| "escalationTier"
			| "verificationEvidence"
			| "closedAt"
			| "rootCause"
		>
	>,
): Promise<AuditCapRecord> {
	const { databases } = await createAdminClient();
	const updated = await databases.updateDocument(db(), capsId(), id, patch);
	return mapCap(updated as unknown as Record<string, unknown>);
}

export async function listOpenCapsAllOrgs(limit = 200): Promise<AuditCapRecord[]> {
	const { databases } = await createAdminClient();
	const result = await databases.listDocuments(db(), capsId(), [
		Query.equal("status", ["open", "in_progress", "escalated", "overdue"]),
		Query.limit(limit),
	]);
	return result.documents.map((row) =>
		mapCap(row as unknown as Record<string, unknown>),
	);
}

export async function createFeedback(
	data: Omit<AuditFeedbackRecord, "$id" | "$createdAt">,
): Promise<AuditFeedbackRecord> {
	const { databases } = await createAdminClient();
	const created = await databases.createDocument(db(), feedbackId(), ID.unique(), {
		orgId: data.orgId,
		documentId: data.documentId,
		report: stringify(data.report),
	});
	return {
		$id: created.$id,
		orgId: data.orgId,
		documentId: data.documentId,
		report: data.report,
		$createdAt: created.$createdAt,
	};
}

export async function getFeedbackForDocument(
	orgId: string,
	documentId: string,
): Promise<AuditFeedbackRecord | null> {
	const { databases } = await createAdminClient();
	const result = await databases.listDocuments(db(), feedbackId(), [
		Query.equal("orgId", orgId),
		Query.equal("documentId", documentId),
		Query.limit(1),
	]);
	const row = result.documents[0];
	if (!row) return null;
	return {
		$id: row.$id,
		orgId: String(row.orgId),
		documentId: String(row.documentId),
		report: parseJson(row.report, {}),
		$createdAt: row.$createdAt,
	};
}

export async function softDeleteDocumentChildren(
	orgId: string,
	documentId: string,
): Promise<void> {
	const findings = await listFindings({ orgId, documentId, limit: 200 });
	const caps = await listCaps({ orgId, documentId, limit: 200 });
	const { databases } = await createAdminClient();
	await Promise.all([
		...findings.map((finding) =>
			databases.updateDocument(db(), findingsId(), finding.$id, {
				status: "closed",
			}),
		),
		...caps.map((cap) =>
			databases.updateDocument(db(), capsId(), cap.$id, {
				status: "closed",
				closedAt: new Date().toISOString(),
			}),
		),
	]);
}

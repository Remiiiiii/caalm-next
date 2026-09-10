import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	EsignEnvelope,
	EsignEnvelopeStatus,
	EsignField,
	EsignRecipient,
	EsignResourceType,
} from "./types";

type EnvelopeRow = Record<string, unknown> & { $id: string };

function tableId(): string {
	const id = appwriteConfig.signatureEnvelopesCollectionId;
	if (!id) throw new Error("Signature envelopes collection is not configured");
	return id;
}

function parseJson<T>(value: unknown, fallback: T): T {
	if (Array.isArray(value)) return value as T;
	if (typeof value !== "string" || !value.trim()) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

type FieldsPayload = {
	items?: EsignField[];
	emailSubject?: string;
	emailMessage?: string;
};

function parseFieldsPayload(value: unknown): FieldsPayload & { fields: EsignField[] } {
	const parsed = parseJson<EsignField[] | FieldsPayload>(value, []);
	if (Array.isArray(parsed)) {
		return { fields: parsed };
	}
	return {
		fields: parsed.items || [],
		emailSubject: parsed.emailSubject,
		emailMessage: parsed.emailMessage,
	};
}

export function rowToEnvelope(row: EnvelopeRow): EsignEnvelope {
	const payload = parseFieldsPayload(row.fields);
	return {
		$id: row.$id,
		orgId: String(row.orgId || ""),
		resourceType: (row.resourceType as EsignResourceType) || "contract",
		resourceId: String(row.resourceId || ""),
		status: (row.status as EsignEnvelopeStatus) || "draft",
		provider: "caalm",
		documentFileId: String(row.documentFileId || ""),
		signedDocumentFileId: row.signedDocumentFileId
			? String(row.signedDocumentFileId)
			: undefined,
		recipients: parseJson<EsignRecipient[]>(row.recipients, []),
		fields: payload.fields,
		processedEventIds: parseJson<string[]>(row.processedEventIds, []),
		expiresAt: row.expiresAt ? String(row.expiresAt) : undefined,
		completedAt: row.completedAt ? String(row.completedAt) : undefined,
		createdBy: String(row.createdBy || ""),
		title: row.title ? String(row.title) : undefined,
		emailSubject:
			(row.emailSubject ? String(row.emailSubject) : undefined) ||
			payload.emailSubject,
		emailMessage:
			(row.emailMessage ? String(row.emailMessage) : undefined) ||
			payload.emailMessage,
		createdAt: row.$createdAt ? String(row.$createdAt) : undefined,
	};
}

function envelopeToData(envelope: Partial<EsignEnvelope>): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	if (envelope.orgId !== undefined) data.orgId = envelope.orgId;
	if (envelope.resourceType !== undefined) data.resourceType = envelope.resourceType;
	if (envelope.resourceId !== undefined) data.resourceId = envelope.resourceId;
	if (envelope.status !== undefined) data.status = envelope.status;
	if (envelope.provider !== undefined) data.provider = envelope.provider;
	if (envelope.documentFileId !== undefined) {
		data.documentFileId = envelope.documentFileId;
	}
	if (envelope.signedDocumentFileId !== undefined) {
		data.signedDocumentFileId = envelope.signedDocumentFileId;
	}
	if (envelope.recipients !== undefined) {
		data.recipients = JSON.stringify(envelope.recipients);
	}
	if (
		envelope.fields !== undefined ||
		envelope.emailSubject !== undefined ||
		envelope.emailMessage !== undefined
	) {
		// Keep subject/message inside `fields` JSON — Appwrite has no emailSubject column.
		data.fields = JSON.stringify({
			items: envelope.fields ?? [],
			emailSubject: envelope.emailSubject,
			emailMessage: envelope.emailMessage,
		});
	}
	if (envelope.processedEventIds !== undefined) {
		data.processedEventIds = JSON.stringify(envelope.processedEventIds);
	}
	if (envelope.expiresAt !== undefined) data.expiresAt = envelope.expiresAt;
	if (envelope.completedAt !== undefined) data.completedAt = envelope.completedAt;
	if (envelope.createdBy !== undefined) data.createdBy = envelope.createdBy;
	if (envelope.title !== undefined) data.title = envelope.title;
	return data;
}

export async function createEnvelopeRow(
	data: Omit<EsignEnvelope, "$id">,
): Promise<EsignEnvelope> {
	const { tablesDB } = await createAdminClient();
	const row = (await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		rowId: ID.unique(),
		data: envelopeToData(data),
	})) as EnvelopeRow;
	return rowToEnvelope(row);
}

export async function getEnvelopeById(envelopeId: string): Promise<EsignEnvelope | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = (await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: tableId(),
			rowId: envelopeId,
		})) as EnvelopeRow;
		return rowToEnvelope(row);
	} catch {
		return null;
	}
}

export async function updateEnvelopeRow(
	envelopeId: string,
	patch: Partial<EsignEnvelope>,
): Promise<EsignEnvelope> {
	const { tablesDB } = await createAdminClient();
	const row = (await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		rowId: envelopeId,
		data: envelopeToData(patch),
	})) as EnvelopeRow;
	return rowToEnvelope(row);
}

export async function findLatestEnvelopeForResource(
	resourceType: EsignResourceType,
	resourceId: string,
): Promise<EsignEnvelope | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: tableId(),
		queries: [
			Query.equal("resourceType", resourceType),
			Query.equal("resourceId", resourceId),
			Query.orderDesc("$createdAt"),
			Query.limit(1),
		],
	});
	const row = result.rows?.[0] as EnvelopeRow | undefined;
	return row ? rowToEnvelope(row) : null;
}

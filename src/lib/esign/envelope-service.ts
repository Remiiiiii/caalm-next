import { ID } from "node-appwrite";
import { isDemoMode } from "@/lib/config/demo-mode";
import {
	createEnvelopeRow,
	findLatestEnvelopeForResource,
	getEnvelopeById,
	updateEnvelopeRow,
} from "./envelope-repository";
import { EsignLinkError } from "./errors";
import { sendSigningInvitation } from "./mail";
import { activateOnEnvelopeCompleted } from "./activate";
import { resolveStorageFileId } from "./document-bytes";
import { loadEsignResource, updateResourceSignatureState } from "./resource";
import { applyRecipientTransition, deriveEnvelopeStatus } from "./status";
import { createSigningToken, signingPageUrl } from "./token";
import type {
	CreateEnvelopeInput,
	EsignEnvelope,
	EsignField,
	EsignRecipient,
	EsignRecipientRole,
	EsignRecipientStatus,
} from "./types";
import {
	getSignersMissingSignatureFields,
	getUnfilledRequiredFields,
} from "./validate-envelope";

function normalizeRecipients(
	input: CreateEnvelopeInput["recipients"],
): EsignRecipient[] {
	return input.map((recipient, index) => ({
		id: ID.unique(),
		email: recipient.email.trim().toLowerCase(),
		name: recipient.name.trim() || recipient.email.trim(),
		role: recipient.role || "signer",
		order: recipient.order ?? index + 1,
		status: "pending",
	}));
}

export async function createEnvelope(
	input: CreateEnvelopeInput,
): Promise<EsignEnvelope> {
	const resource = await loadEsignResource(input.resourceType, input.resourceId);
	if (!resource) throw new Error("Document not found");
	if (resource.orgId && input.orgId && resource.orgId !== input.orgId) {
		throw new Error("Document is outside this organization");
	}
	if (!["pending-signature", "pending-review"].includes(resource.status)) {
		throw new Error("Document is not waiting for signature");
	}

	const existing = await findLatestEnvelopeForResource(
		input.resourceType,
		input.resourceId,
	);
	if (existing && existing.status === "draft") {
		return updateDraftEnvelope(existing.$id, {
			recipients: input.recipients,
			fields: input.fields,
			emailSubject: input.emailSubject,
			emailMessage: input.emailMessage,
			title: input.title,
			documentFileId: input.documentFileId,
		});
	}
	if (
		existing &&
		existing.status !== "voided" &&
		existing.status !== "declined" &&
		existing.status !== "expired"
	) {
		return existing;
	}

	const recipients = normalizeRecipients(input.recipients);
	if (!recipients.some((r) => r.role === "signer")) {
		throw new Error("At least one signer is required");
	}

	const documentFileIdRaw = input.documentFileId || resource.documentFileId;
	if (!documentFileIdRaw) {
		throw new Error("Document file is missing");
	}
	const documentFileId = await resolveStorageFileId(documentFileIdRaw);

	const envelope = await createEnvelopeRow({
		orgId: input.orgId || resource.orgId,
		resourceType: input.resourceType,
		resourceId: input.resourceId,
		status: "draft",
		provider: "caalm",
		documentFileId,
		recipients,
		fields: input.fields || [],
		processedEventIds: [],
		expiresAt: input.expiresAt,
		createdBy: input.createdBy,
		title: input.title || resource.title,
		emailSubject: input.emailSubject,
		emailMessage: input.emailMessage,
	});

	await updateResourceSignatureState({
		resourceType: input.resourceType,
		resourceId: input.resourceId,
		digitalSignatureStatus: "pending",
		digitalSignatureEnvelopeId: envelope.$id,
		digitalSignaturePlatform: "caalm",
	});

	return envelope;
}

export type DraftEnvelopePatch = {
	recipients?: Array<{
		id?: string;
		email: string;
		name: string;
		role?: EsignRecipientRole;
		order?: number;
	}>;
	fields?: EsignField[];
	emailSubject?: string;
	emailMessage?: string;
	title?: string;
	documentFileId?: string;
};

function mergeDraftRecipients(
	existing: EsignRecipient[],
	incoming: NonNullable<DraftEnvelopePatch["recipients"]>,
): EsignRecipient[] {
	return incoming.map((recipient, index) => {
		const email = recipient.email.trim().toLowerCase();
		const previous =
			existing.find((row) => row.id === recipient.id) ||
			existing.find((row) => row.email === email);
		return {
			id: previous?.id || ID.unique(),
			email,
			name: recipient.name.trim() || email,
			role: recipient.role || "signer",
			order: recipient.order ?? index + 1,
			status: previous?.status || "pending",
			signedAt: previous?.signedAt,
			viewedAt: previous?.viewedAt,
			declinedAt: previous?.declinedAt,
			signatureDataUrl: previous?.signatureDataUrl,
		};
	});
}

export async function updateDraftEnvelope(
	envelopeId: string,
	patch: DraftEnvelopePatch,
): Promise<EsignEnvelope> {
	const envelope = await getEnvelopeById(envelopeId);
	if (!envelope) throw new Error("Envelope not found");
	if (envelope.status !== "draft") {
		throw new EsignLinkError("ESIGN-409", "Envelope has already been sent");
	}

	const recipients = patch.recipients
		? mergeDraftRecipients(envelope.recipients, patch.recipients)
		: envelope.recipients;
	if (!recipients.some((r) => r.role === "signer")) {
		throw new Error("At least one signer is required");
	}

	const recipientIds = new Set(recipients.map((r) => r.id));
	const fields = (patch.fields ?? envelope.fields).filter((field) =>
		recipientIds.has(field.recipientId),
	);

	return updateEnvelopeRow(envelopeId, {
		recipients,
		fields,
		emailSubject: patch.emailSubject ?? envelope.emailSubject,
		emailMessage: patch.emailMessage ?? envelope.emailMessage,
		title: patch.title ?? envelope.title,
		documentFileId: patch.documentFileId || envelope.documentFileId,
	});
}

export async function sendEnvelope(envelopeId: string): Promise<EsignEnvelope> {
	const envelope = await getEnvelopeById(envelopeId);
	if (!envelope) throw new Error("Envelope not found");
	if (envelope.status === "voided") throw new Error("Envelope is voided");
	if (envelope.status === "completed") return envelope;
	if (envelope.status !== "draft") {
		throw new EsignLinkError("ESIGN-409", "Envelope has already been sent");
	}

	const missing = getSignersMissingSignatureFields(envelope);
	if (missing.length > 0) {
		const error = new Error("The following signers are missing signature fields");
		(error as Error & { missing: typeof missing }).missing = missing;
		throw error;
	}

	const recipients = envelope.recipients.map((recipient) =>
		recipient.role === "signer"
			? { ...recipient, status: applyRecipientTransition(recipient.status, "sent") }
			: recipient,
	);

	if (!isDemoMode()) {
		for (const recipient of recipients.filter((r) => r.role === "signer")) {
			const token = createSigningToken(envelope.$id, recipient.id);
			await sendSigningInvitation(envelope, recipient, token);
		}
	}

	const status = deriveEnvelopeStatus(recipients, "sent");
	return updateEnvelopeRow(envelopeId, { recipients, status });
}

export async function getEnvelope(envelopeId: string): Promise<EsignEnvelope | null> {
	return getEnvelopeById(envelopeId);
}

export async function getLatestEnvelopeForResource(
	resourceType: EsignEnvelope["resourceType"],
	resourceId: string,
): Promise<EsignEnvelope | null> {
	return findLatestEnvelopeForResource(resourceType, resourceId);
}

export function recipientSigningLinks(envelope: EsignEnvelope) {
	return envelope.recipients
		.filter((recipient) => recipient.role === "signer")
		.map((recipient) => {
			const token = createSigningToken(envelope.$id, recipient.id);
			return {
				recipientId: recipient.id,
				email: recipient.email,
				name: recipient.name,
				status: recipient.status,
				token,
				url: signingPageUrl(token),
			};
		});
}

export async function voidEnvelope(envelopeId: string): Promise<EsignEnvelope> {
	const envelope = await getEnvelopeById(envelopeId);
	if (!envelope) throw new Error("Envelope not found");
	if (envelope.status === "completed") {
		throw new Error("Completed envelopes cannot be voided");
	}
	return updateEnvelopeRow(envelopeId, { status: "voided" });
}

export async function recordRecipientEvent(input: {
	envelopeId: string;
	recipientId: string;
	nextStatus: EsignRecipientStatus;
	signatureDataUrl?: string;
	fieldValues?: Record<string, string>;
	eventId?: string;
}): Promise<EsignEnvelope> {
	const envelope = await getEnvelopeById(input.envelopeId);
	if (!envelope) throw new Error("Envelope not found");

	if (input.eventId && envelope.processedEventIds.includes(input.eventId)) {
		return envelope;
	}

	const now = new Date().toISOString();
	const recipients = envelope.recipients.map((recipient) => {
		if (recipient.id !== input.recipientId) return recipient;
		const status = applyRecipientTransition(recipient.status, input.nextStatus);
		return {
			...recipient,
			status,
			viewedAt:
				input.nextStatus === "viewed" ? recipient.viewedAt || now : recipient.viewedAt,
			signedAt: input.nextStatus === "signed" ? now : recipient.signedAt,
			declinedAt: input.nextStatus === "declined" ? now : recipient.declinedAt,
			signatureDataUrl: input.signatureDataUrl || recipient.signatureDataUrl,
		};
	});

	const fields = envelope.fields.map((field) => {
		const value = input.fieldValues?.[field.id];
		return value !== undefined ? { ...field, value } : field;
	});

	const processedEventIds = input.eventId
		? [...envelope.processedEventIds, input.eventId]
		: envelope.processedEventIds;

	const status = deriveEnvelopeStatus(recipients, envelope.status);
	let next = await updateEnvelopeRow(envelope.$id, {
		recipients,
		fields,
		status,
		processedEventIds,
		completedAt: status === "completed" ? now : envelope.completedAt,
	});

	if (status === "completed" && envelope.status !== "completed") {
		next = await activateOnEnvelopeCompleted(next);
	} else if (status === "declined") {
		await updateResourceSignatureState({
			resourceType: envelope.resourceType,
			resourceId: envelope.resourceId,
			digitalSignatureStatus: "declined",
			digitalSignatureEnvelopeId: envelope.$id,
		});
	}

	return next;
}

export function assertSignFieldsComplete(
	envelope: EsignEnvelope,
	recipientId: string,
	fieldValues?: Record<string, string>,
	signatureDataUrl?: string,
): void {
	const recipient = envelope.recipients.find((r) => r.id === recipientId);
	if (!recipient) throw new EsignLinkError("ESIGN-404", "Recipient not found");
	const fields = envelope.fields.filter((field) => field.recipientId === recipientId);
	const unfilled = getUnfilledRequiredFields(
		fields,
		{ ...recipient, signatureDataUrl: signatureDataUrl || recipient.signatureDataUrl },
		fieldValues,
	);
	if (unfilled.length > 0) {
		throw new Error("Fill every required field before signing");
	}
}

export function publicSigningView(envelope: EsignEnvelope, recipientId: string) {
	const recipient = envelope.recipients.find((r) => r.id === recipientId);
	if (!recipient) throw new EsignLinkError("ESIGN-404", "Recipient not found");
	if (envelope.status === "voided" || envelope.status === "expired") {
		throw new EsignLinkError("ESIGN-409", "This signing link is no longer valid");
	}
	if (envelope.status === "declined") {
		throw new EsignLinkError("ESIGN-409", "This envelope was declined");
	}
	if (envelope.expiresAt && new Date(envelope.expiresAt).getTime() < Date.now()) {
		throw new EsignLinkError("ESIGN-410", "This signing link has expired");
	}

	return {
		envelopeId: envelope.$id,
		title: envelope.title || "Document",
		status: envelope.status,
		resourceType: envelope.resourceType,
		resourceId: envelope.resourceId,
		recipient: {
			id: recipient.id,
			name: recipient.name,
			email: recipient.email,
			role: recipient.role,
			status: recipient.status,
		},
		fields: envelope.fields.filter((field) => field.recipientId === recipient.id),
		documentFileId: envelope.documentFileId,
		alreadySigned: recipient.status === "signed",
		declined: recipient.status === "declined",
	};
}

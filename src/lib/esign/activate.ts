import { ID } from "node-appwrite";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { sendEnvelopeCompletedNotice } from "./mail";
import { sealSignedPdf } from "./pdf";
import { updateEnvelopeRow } from "./envelope-repository";
import { loadEsignResource, updateResourceSignatureState } from "./resource";
import type { EsignEnvelope } from "./types";

export async function activateOnEnvelopeCompleted(
	envelope: EsignEnvelope,
): Promise<EsignEnvelope> {
	const completedAt = envelope.completedAt || new Date().toISOString();
	const signedDocumentFileId = await sealSignedPdf({
		...envelope,
		completedAt,
	});

	const next = await updateEnvelopeRow(envelope.$id, {
		status: "completed",
		completedAt,
		signedDocumentFileId,
	});

	await updateResourceSignatureState({
		resourceType: envelope.resourceType,
		resourceId: envelope.resourceId,
		status: "active",
		digitalSignatureStatus: "completed",
		digitalSignatureEnvelopeId: envelope.$id,
		digitalSignatureCompletedAt: completedAt,
		digitalSignaturePlatform: "caalm",
	});

	const resource = await loadEsignResource(
		envelope.resourceType,
		envelope.resourceId,
	);

	await logAuditEvent({
		event_id: ID.unique(),
		event_title: "E-signature completed",
		action: "update",
		source: "caalm",
		user_id: envelope.createdBy || "system",
		user_name: "CAALM Execute",
		user_email: "",
		orgId: envelope.orgId,
		status: "success",
		module: envelope.resourceType === "license" ? "licenses" : "contracts",
		target_type: envelope.resourceType,
		target_id: envelope.resourceId,
		target_label: envelope.title || resource?.title,
		summary: `Envelope ${envelope.$id} completed; resource activated`,
		changes: [
			{ field: "status", before: "pending-signature", after: "active" },
			{ field: "digitalSignatureStatus", before: "pending", after: "completed" },
		],
	});

	const notify = [
		resource?.ownerEmail,
		...envelope.recipients.map((r) => r.email),
	].filter((email): email is string => Boolean(email));
	await sendEnvelopeCompletedNotice([...new Set(notify)], next);

	return next;
}

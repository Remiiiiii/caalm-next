import { ID } from "node-appwrite";
import { getConstituentById } from "@/lib/constituents";
import { createEnvelopeRow } from "@/lib/esign/envelope-repository";
import { resolveStorageFileId } from "@/lib/esign/document-bytes";
import type { EsignRecipient } from "@/lib/esign/types";
import {
	createVolunteerWaiverRow,
	findWaiverByEnvelopeId,
	updateVolunteerWaiverStatus,
} from "./volunteer-waivers.repository";

export async function createVolunteerAcknowledgmentEnvelope(input: {
	orgId: string;
	constituentId: string;
	documentFileId: string;
	createdBy: string;
	recipientEmail: string;
	recipientName: string;
	title?: string;
}): Promise<{ envelopeId: string; waiverId: string }> {
	const constituent = await getConstituentById(input.constituentId);
	if (!constituent || constituent.orgId !== input.orgId) {
		throw new Error("Constituent not found");
	}

	const documentFileId = await resolveStorageFileId(input.documentFileId);
	const recipientId = ID.unique();
	const recipients: EsignRecipient[] = [
		{
			id: recipientId,
			email: input.recipientEmail.trim().toLowerCase(),
			name: input.recipientName.trim() || input.recipientEmail.trim(),
			role: "signer",
			order: 1,
			status: "pending",
		},
	];

	const envelope = await createEnvelopeRow({
		orgId: input.orgId,
		resourceType: "constituent",
		resourceId: input.constituentId,
		status: "draft",
		provider: "caalm",
		documentFileId,
		recipients,
		fields: [],
		processedEventIds: [],
		createdBy: input.createdBy,
		title: input.title || "Volunteer waiver / acknowledgment",
		purpose: "acknowledgment",
	});

	const waiver = await createVolunteerWaiverRow({
		orgId: input.orgId,
		constituentId: input.constituentId,
		documentFileId,
		envelopeId: envelope.$id,
		createdBy: input.createdBy,
		status: "draft",
	});

	return { envelopeId: envelope.$id, waiverId: waiver.$id };
}

export async function markVolunteerWaiverCompleted(envelopeId: string): Promise<void> {
	const waiver = await findWaiverByEnvelopeId(envelopeId);
	if (!waiver) return;
	await updateVolunteerWaiverStatus(waiver.orgId, waiver.$id, "completed");
}

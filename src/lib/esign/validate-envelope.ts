import type { EsignEnvelope, EsignField, EsignRecipient } from "./types";

export type MissingSignatureSigner = {
	id: string;
	email: string;
	name: string;
};

/** Signers who still need at least one signature widget on the PDF. */
export function getSignersMissingSignatureFields(
	envelope: Pick<EsignEnvelope, "recipients" | "fields">,
): MissingSignatureSigner[] {
	const signers = envelope.recipients.filter((r) => r.role === "signer");
	return signers
		.filter(
			(signer) =>
				!envelope.fields.some(
					(field) =>
						field.recipientId === signer.id && field.type === "signature",
				),
		)
		.map((signer) => ({
			id: signer.id,
			email: signer.email,
			name: signer.name,
		}));
}

export function isRequiredField(field: EsignField): boolean {
	return field.required !== false;
}

export function isFieldFilled(
	field: EsignField,
	recipient: Pick<EsignRecipient, "signatureDataUrl" | "name" | "email">,
	fieldValues?: Record<string, string>,
): boolean {
	const overlay = fieldValues?.[field.id] ?? field.value;
	if (field.type === "signature") {
		return Boolean(overlay || recipient.signatureDataUrl);
	}
	if (field.type === "name") {
		return Boolean((overlay || recipient.name || "").trim());
	}
	if (field.type === "email") {
		return Boolean((overlay || recipient.email || "").trim());
	}
	return Boolean((overlay || "").trim());
}

export function getUnfilledRequiredFields(
	fields: EsignField[],
	recipient: Pick<EsignRecipient, "signatureDataUrl" | "name" | "email">,
	fieldValues?: Record<string, string>,
): EsignField[] {
	return fields.filter(
		(field) =>
			isRequiredField(field) && !isFieldFilled(field, recipient, fieldValues),
	);
}

export function dedupeSignerEmails(
	recipients: Array<{ email: string; name: string }>,
): Array<{ email: string; name: string }> {
	const seen = new Set<string>();
	const unique: Array<{ email: string; name: string }> = [];
	for (const row of recipients) {
		const email = row.email.trim().toLowerCase();
		if (!email || seen.has(email)) continue;
		seen.add(email);
		unique.push({ email, name: row.name.trim() || email });
	}
	return unique;
}

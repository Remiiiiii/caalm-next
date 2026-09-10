export const ESIGN_ENVELOPE_STATUSES = [
	"draft",
	"sent",
	"viewed",
	"partially_signed",
	"completed",
	"declined",
	"voided",
	"expired",
] as const;

export type EsignEnvelopeStatus = (typeof ESIGN_ENVELOPE_STATUSES)[number];

export const ESIGN_RECIPIENT_STATUSES = [
	"pending",
	"sent",
	"viewed",
	"signed",
	"declined",
] as const;

export type EsignRecipientStatus = (typeof ESIGN_RECIPIENT_STATUSES)[number];

export type EsignRecipientRole = "signer" | "cc";
export type EsignResourceType = "contract" | "license";
export type EsignFieldType = "signature" | "date" | "text" | "name" | "email";
export type EsignProviderId = "caalm";

export type EsignWebhookEventName =
	| "envelope.sent"
	| "envelope.viewed"
	| "envelope.signed"
	| "envelope.completed"
	| "envelope.declined"
	| "envelope.voided";

export interface EsignRecipient {
	id: string;
	email: string;
	name: string;
	role: EsignRecipientRole;
	order: number;
	status: EsignRecipientStatus;
	signedAt?: string;
	viewedAt?: string;
	declinedAt?: string;
	signatureDataUrl?: string;
}

export interface EsignField {
	id: string;
	recipientId: string;
	type: EsignFieldType;
	page: number;
	/** 0–100 percentage of page width/height */
	x: number;
	y: number;
	width: number;
	height: number;
	value?: string;
	required?: boolean;
}

export interface EsignEnvelope {
	$id: string;
	orgId: string;
	resourceType: EsignResourceType;
	resourceId: string;
	status: EsignEnvelopeStatus;
	provider: EsignProviderId;
	documentFileId: string;
	signedDocumentFileId?: string;
	recipients: EsignRecipient[];
	fields: EsignField[];
	processedEventIds: string[];
	expiresAt?: string;
	completedAt?: string;
	createdBy: string;
	title?: string;
	emailSubject?: string;
	emailMessage?: string;
	createdAt?: string;
}

export interface CreateEnvelopeInput {
	orgId: string;
	resourceType: EsignResourceType;
	resourceId: string;
	documentFileId: string;
	createdBy: string;
	title?: string;
	recipients: Array<{
		email: string;
		name: string;
		role?: EsignRecipientRole;
		order?: number;
	}>;
	fields?: EsignField[];
	expiresAt?: string;
	emailSubject?: string;
	emailMessage?: string;
}

export interface EnvelopeResult {
	envelope: EsignEnvelope;
}

export interface WebhookResult {
	duplicate: boolean;
	event: EsignWebhookEventName;
	envelopeId: string;
	status: EsignEnvelopeStatus;
}

export interface EsignProvider {
	createEnvelope(input: CreateEnvelopeInput): Promise<EnvelopeResult>;
	sendEnvelope(envelopeId: string): Promise<EsignEnvelope>;
	getSigningUrl(recipientToken: string): Promise<string>;
	handleWebhook(payload: unknown, headers: Headers): Promise<WebhookResult>;
}

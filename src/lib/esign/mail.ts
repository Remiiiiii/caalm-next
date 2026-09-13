import { mailgunService } from "@/lib/services/mailgun";
import {
	applyEsignEmailTemplate,
	defaultEsignEmailMessage,
	defaultEsignEmailSubject,
} from "./email-template";
import { signingPageUrl } from "./token";
import type { EsignEnvelope, EsignRecipient } from "./types";

export async function sendSigningInvitation(
	envelope: EsignEnvelope,
	recipient: EsignRecipient,
	token: string,
): Promise<void> {
	const link = signingPageUrl(token);
	const title = envelope.title || "document";
	const vars = {
		signerName: recipient.name || "there",
		signerEmail: recipient.email,
		documentName: title,
	};
	const subject = applyEsignEmailTemplate(
		envelope.emailSubject || defaultEsignEmailSubject(title),
		vars,
	);
	const body = applyEsignEmailTemplate(
		envelope.emailMessage || defaultEsignEmailMessage(title),
		vars,
	);
	await mailgunService.sendEmail({
		to: recipient.email,
		subject,
		text: `${body}\n\nReview and sign:\n${link}\n\nIf you were not expecting this, you can ignore the email.`,
		html: `<p>${body.replaceAll("\n", "<br/>")}</p><p><a href="${link}">Review and sign</a></p><p>If you were not expecting this, you can ignore the email.</p>`,
	});
}

export async function sendEnvelopeCompletedNotice(
	to: string[],
	envelope: EsignEnvelope,
): Promise<void> {
	if (to.length === 0) return;
	const title = envelope.title || "document";
	await mailgunService.sendEmail({
		to,
		subject: `Signed: ${title}`,
		text: `"${title}" has been fully signed and is now active.`,
		html: `<p><strong>${title}</strong> has been fully signed and is now active.</p>`,
	});
}

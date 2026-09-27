import { canContact } from "@/lib/constituents/consent";
import type { Constituent } from "@/lib/constituents/types";
import { mailgunService } from "@/lib/services/mailgun";
import { preferenceCenterUrl } from "@/lib/constituents/preference-token";

export type SendAppealEmailInput = {
	constituent: Constituent;
	subject: string;
	bodyText: string;
	bodyHtml?: string;
	preferenceToken?: string;
};

export type SendAppealEmailResult =
	| { sent: true }
	| { sent: false; reason: "no_email" | "do_not_contact" | "consent" };

/** Outbound fundraising appeal — must respect channel consent (10.3). */
export async function sendAppealEmail(
	input: SendAppealEmailInput,
): Promise<SendAppealEmailResult> {
	if (!canContact(input.constituent, "email")) {
		return {
			sent: false,
			reason: input.constituent.doNotContact ? "do_not_contact" : "consent",
		};
	}
	const email = input.constituent.email?.trim();
	if (!email) {
		return { sent: false, reason: "no_email" };
	}

	let text = input.bodyText;
	let html = input.bodyHtml ?? input.bodyText.replace(/\n/g, "<br />");
	if (input.preferenceToken) {
		const prefsUrl = preferenceCenterUrl(input.preferenceToken);
		text += `\n\nManage email preferences: ${prefsUrl}`;
		html += `<p><a href="${prefsUrl}">Manage email preferences</a></p>`;
	}

	await mailgunService.sendEmail({
		to: email,
		subject: input.subject,
		text,
		html,
	});
	return { sent: true };
}

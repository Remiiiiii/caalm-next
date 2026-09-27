import { canContact } from "@/lib/constituents/consent";
import { getConstituentById } from "@/lib/constituents/repository";
import type { Gift } from "@/lib/gifts/types";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { mailgunService } from "@/lib/services/mailgun";
import {
	applyGiftReceiptTemplate,
	DEFAULT_GIFT_RECEIPT_BODY,
	DEFAULT_GIFT_RECEIPT_SUBJECT,
	formatGiftAmount,
} from "./gift-receipt-template";

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

export type SendGiftReceiptResult =
	| { sent: true }
	| { sent: false; reason: "anonymous" | "no_email" | "do_not_contact" | "draft" | "already_sent" | "not_posted" };

export async function markGiftReceiptSent(
	giftId: string,
	sentAt: string,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: giftsTableId(),
		rowId: giftId,
		data: { receiptSentAt: sentAt },
	});
}

/** Idempotent: one receipt email per posted gift id. */
export async function sendPostedGiftReceiptIfEligible(
	gift: Gift,
	options?: { orgName?: string; receiptSentAt?: string | null },
): Promise<SendGiftReceiptResult> {
	if (gift.status !== "posted") {
		return { sent: false, reason: "not_posted" };
	}
	if (options?.receiptSentAt ?? gift.receiptSentAt) {
		return { sent: false, reason: "already_sent" };
	}
	if (gift.anonymous) {
		return { sent: false, reason: "anonymous" };
	}

	const constituent = await getConstituentById(gift.constituentId);
	if (!constituent || constituent.orgId !== gift.orgId) {
		return { sent: false, reason: "no_email" };
	}
	if (!canContact(constituent, "email")) {
		return { sent: false, reason: "do_not_contact" };
	}
	const email = constituent.email?.trim();
	if (!email) {
		return { sent: false, reason: "no_email" };
	}

	const receiptNumber = String(gift.receiptNumber ?? gift.$id);
	const vars = {
		donorName: `${constituent.firstName} ${constituent.lastName}`.trim() || "Friend",
		amount: formatGiftAmount(gift.amount, gift.currency),
		giftDate: new Date(gift.giftDate).toLocaleDateString(),
		receiptNumber,
		orgName: options?.orgName?.trim() || "Your organization",
	};

	const subject = applyGiftReceiptTemplate(DEFAULT_GIFT_RECEIPT_SUBJECT, vars);
	const body = applyGiftReceiptTemplate(DEFAULT_GIFT_RECEIPT_BODY, vars);

	await mailgunService.sendEmail({
		to: email,
		subject,
		text: body,
		html: body.replaceAll("\n", "<br/>"),
	});

	const sentAt = new Date().toISOString();
	await markGiftReceiptSent(gift.$id, sentAt);
	return { sent: true };
}

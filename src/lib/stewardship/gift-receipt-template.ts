export type GiftReceiptTemplateVars = {
	donorName: string;
	amount: string;
	giftDate: string;
	receiptNumber: string;
	orgName: string;
};

/** Default org-branded copy; org overrides can layer on notification settings later. */
export const DEFAULT_GIFT_RECEIPT_SUBJECT =
	"Thank you — gift receipt #{receiptNumber}";

export const DEFAULT_GIFT_RECEIPT_BODY = `Dear {donorName},

Thank you for your generous support. This email confirms your gift for your records.

Amount: {amount}
Date: {giftDate}
Receipt number: {receiptNumber}

No goods or services were provided in exchange for this contribution except as noted by your organization.

With gratitude,
{orgName}`;

export function applyGiftReceiptTemplate(
	template: string,
	vars: GiftReceiptTemplateVars,
): string {
	return template
		.replaceAll("{donorName}", vars.donorName)
		.replaceAll("{amount}", vars.amount)
		.replaceAll("{giftDate}", vars.giftDate)
		.replaceAll("{receiptNumber}", vars.receiptNumber)
		.replaceAll("{orgName}", vars.orgName)
		.replaceAll("#{receiptNumber}", vars.receiptNumber);
}

export function formatGiftAmount(amount: number, currency: string): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: currency || "USD",
	}).format(amount);
}

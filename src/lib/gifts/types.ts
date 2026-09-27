export const GIFT_STATUSES = ["draft", "posted", "voided"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export const GIFT_METHODS = [
	"check",
	"card",
	"cash",
	"wire",
	"ach",
	"other",
] as const;
export type GiftMethod = (typeof GIFT_METHODS)[number];

export type Gift = {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	orgId: string;
	amount: number;
	currency: string;
	giftDate: string;
	method: GiftMethod;
	status: GiftStatus;
	constituentId: string;
	campaignId?: string;
	designationId?: string;
	fundCode: string;
	contractId?: string;
	receiptNumber?: number;
	anonymous: boolean;
	voidOfId?: string;
	receiptSentAt?: string;
};

export type GiftListFilters = {
	orgId: string;
	status?: GiftStatus;
	search?: string;
	campaignId?: string;
	limit?: number;
	offset?: number;
};

export type CreateGiftInput = {
	orgId: string;
	amount: number;
	currency?: string;
	giftDate: string;
	method: GiftMethod;
	constituentId: string;
	campaignId?: string;
	designationId?: string;
	contractId?: string;
	anonymous?: boolean;
};

export type UpdateDraftGiftInput = {
	amount?: number;
	currency?: string;
	giftDate?: string;
	method?: GiftMethod;
	constituentId?: string;
	campaignId?: string | null;
	designationId?: string | null;
	contractId?: string | null;
	anonymous?: boolean;
};

export function isGiftStatus(value: unknown): value is GiftStatus {
	return (
		typeof value === "string" &&
		(GIFT_STATUSES as readonly string[]).includes(value)
	);
}

export function isGiftMethod(value: unknown): value is GiftMethod {
	return (
		typeof value === "string" &&
		(GIFT_METHODS as readonly string[]).includes(value)
	);
}

export function giftStatusBadgeClass(status: GiftStatus): string {
	switch (status) {
		case "posted":
			return "bg-green/10 text-green border-green/20";
		case "voided":
			return "bg-red/10 text-red border-red/20";
		default:
			return "bg-orange/10 text-orange border-orange/20";
	}
}

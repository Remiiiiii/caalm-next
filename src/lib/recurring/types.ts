import type { GiftMethod } from "@/lib/gifts/types";

export const RECURRING_FREQUENCIES = ["monthly", "annual"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export type RecurringGiftSchedule = {
	$id: string;
	orgId: string;
	constituentId: string;
	amount: number;
	currency: string;
	method: GiftMethod;
	frequency: RecurringFrequency;
	nextDueDate: string;
	active: boolean;
	campaignId?: string;
	designationId?: string;
	lastSkipReason?: string;
};

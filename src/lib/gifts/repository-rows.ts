import type { Gift, GiftMethod, GiftStatus } from "./types";
import { isGiftMethod, isGiftStatus } from "./types";

export function mapGiftRow(row: Record<string, unknown>): Gift {
	const method = isGiftMethod(row.method) ? row.method : "other";
	const status = isGiftStatus(row.status) ? row.status : "draft";
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		amount: Number(row.amount),
		currency: String(row.currency || "USD"),
		giftDate: String(row.giftDate || ""),
		method,
		status,
		constituentId: String(row.constituentId || ""),
		campaignId: row.campaignId ? String(row.campaignId) : undefined,
		designationId: row.designationId ? String(row.designationId) : undefined,
		fundCode: String(row.fundCode || "UNRESTRICTED"),
		contractId: row.contractId ? String(row.contractId) : undefined,
		receiptNumber:
			row.receiptNumber != null ? Number(row.receiptNumber) : undefined,
		anonymous: Boolean(row.anonymous),
		voidOfId: row.voidOfId ? String(row.voidOfId) : undefined,
		receiptSentAt: row.receiptSentAt ? String(row.receiptSentAt) : undefined,
	};
}

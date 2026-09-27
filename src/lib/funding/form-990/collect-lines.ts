import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { Gift } from "@/lib/gifts/types";
import { listObligations } from "@/lib/funding/obligation.repository";
import type { ContractObligation } from "@/lib/funding/types";
import type { Form990ExpenseLine } from "./types";
import { dateInRange, parseIsoDateRange } from "./worksheet";

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "test-gifts";
}

function mapGift(row: Record<string, unknown>): Gift {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		amount: Number(row.amount || 0),
		currency: String(row.currency || "USD"),
		giftDate: String(row.giftDate || ""),
		method: (row.method as Gift["method"]) || "other",
		status: (row.status as Gift["status"]) || "draft",
		constituentId: String(row.constituentId || ""),
		campaignId: row.campaignId ? String(row.campaignId) : undefined,
		designationId: row.designationId ? String(row.designationId) : undefined,
		fundCode: String(row.fundCode || ""),
		contractId: row.contractId ? String(row.contractId) : undefined,
		receiptNumber:
			row.receiptNumber != null ? Number(row.receiptNumber) : undefined,
		anonymous: Boolean(row.anonymous),
		voidOfId: row.voidOfId ? String(row.voidOfId) : undefined,
	};
}

function obligationToLine(ob: ContractObligation): Form990ExpenseLine | null {
	if (ob.status !== "done") return null;
	const amount = Number(ob.actualAmount ?? 0);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return {
		sourceType: "obligation_kind",
		sourceKey: ob.kind,
		amount,
		contractId: ob.contractId,
		referenceId: ob.$id,
		referenceLabel: ob.title,
		eventDate: ob.completedAt || ob.dueDate || ob.$updatedAt,
	};
}

function giftToLine(gift: Gift): Form990ExpenseLine | null {
	if (gift.status !== "posted") return null;
	if (gift.voidOfId) return null;
	if (!gift.contractId) return null;
	if (!Number.isFinite(gift.amount) || gift.amount <= 0) return null;
	return {
		sourceType: "gift",
		sourceKey: "gift_cash",
		amount: gift.amount,
		contractId: gift.contractId,
		referenceId: gift.$id,
		referenceLabel: `Gift ${gift.receiptNumber ?? gift.$id}`,
		eventDate: gift.giftDate,
	};
}

export async function collectForm990ExpenseLines(input: {
	orgId: string;
	startDate: string;
	endDate: string;
}): Promise<Form990ExpenseLine[]> {
	const range = parseIsoDateRange(input.startDate, input.endDate);
	if (!range) {
		throw new Error("Invalid date range");
	}

	const obligations = await listObligations({ orgId: input.orgId, limit: 2000 });
	const obligationLines = obligations
		.map(obligationToLine)
		.filter((line): line is Form990ExpenseLine => line != null)
		.filter((line) => dateInRange(line.eventDate, range));

	const { tablesDB } = await createAdminClient();
	const giftResult = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: giftsTableId(),
		queries: [
			Query.equal("orgId", input.orgId),
			Query.equal("status", "posted"),
			Query.limit(5000),
		],
	});
	const gifts = (giftResult.rows as unknown as Record<string, unknown>[]).map(
		mapGift,
	);
	const giftLines = gifts
		.map(giftToLine)
		.filter((line): line is Form990ExpenseLine => line != null)
		.filter((line) => dateInRange(line.eventDate, range));

	return [...obligationLines, ...giftLines];
}

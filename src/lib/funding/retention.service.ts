import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { computeRetentionHealth, daysUntil } from "./constants";
// computeRetentionHealth ranks streams by expiry + obligation pressure
import { listObligations } from "./obligation.repository";
import type {
	ContractObligation,
	RetentionStream,
	RetentionSummary,
} from "./types";

type ContractRow = {
	$id: string;
	contractName?: string;
	name?: string;
	amount?: number | string;
	currencyCode?: string;
	currency?: string;
	contractExpiryDate?: string;
	expiryDate?: string;
	lifecycleStatus?: string;
	status?: string;
	department?: string;
	ownerName?: string;
};

function parseAmount(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const n = Number(value.replace(/[$,]/g, ""));
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

/**
 * Dollar-ranked retention board.
 * Reads live Contracts (no duplicate money store) and overlays obligations.
 */
export async function buildRetentionSummary(input: {
	orgId: string;
	limit?: number;
}): Promise<RetentionSummary> {
	const { tablesDB } = await createAdminClient();
	const contractsTable =
		appwriteConfig.contractsCollectionId || "test-contracts";

	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: contractsTable,
		queries: [
			Query.equal("orgId", input.orgId),
			Query.limit(input.limit ?? 500),
			Query.orderDesc("$updatedAt"),
		],
	});

	const contracts = result.rows as unknown as ContractRow[];
	const obligations = await listObligations({
		orgId: input.orgId,
		limit: 1000,
	});

	const byContract = new Map<string, ContractObligation[]>();
	for (const ob of obligations) {
		const list = byContract.get(ob.contractId) || [];
		list.push(ob);
		byContract.set(ob.contractId, list);
	}

	const streams: RetentionStream[] = contracts.map((c) => {
		const amount = parseAmount(c.amount);
		const expiry = c.contractExpiryDate || c.expiryDate || null;
		const days = daysUntil(expiry);
		const obs = byContract.get(c.$id) || [];
		const openStatuses = new Set(["open", "in_progress", "overdue"]);
		const open = obs.filter((o) => openStatuses.has(o.status));
		const overdue = obs.filter((o) => {
			if (o.status === "overdue") return true;
			if (!o.dueDate || !openStatuses.has(o.status)) return false;
			const d = daysUntil(o.dueDate);
			return d != null && d < 0;
		});

		return {
			contractId: c.$id,
			contractName: c.contractName || c.name || "Untitled contract",
			amount,
			currency: c.currencyCode || c.currency || "USD",
			expiryDate: expiry,
			daysUntilExpiry: days,
			lifecycleStatus: c.lifecycleStatus,
			status: c.status,
			department: c.department,
			ownerName: c.ownerName,
			health: computeRetentionHealth({
				daysUntilExpiry: days,
				openObligationCount: open.length,
				overdueObligationCount: overdue.length,
				lifecycleStatus: c.lifecycleStatus,
			}),
			openObligationCount: open.length,
			overdueObligationCount: overdue.length,
			obligations: obs,
		};
	});

	streams.sort((a, b) => b.amount - a.amount);

	let totalAtRiskAmount = 0;
	let totalProtectingAmount = 0;
	let totalProtectedAmount = 0;
	for (const s of streams) {
		if (s.health === "at_risk" || s.health === "expired") {
			totalAtRiskAmount += s.amount;
		} else if (s.health === "protecting") {
			totalProtectingAmount += s.amount;
		} else {
			totalProtectedAmount += s.amount;
		}
	}

	return {
		totalAtRiskAmount,
		totalProtectingAmount,
		totalProtectedAmount,
		streamCount: streams.length,
		streams,
	};
}

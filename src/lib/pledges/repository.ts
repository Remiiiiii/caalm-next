import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { canContact } from "@/lib/constituents/consent";
import { getConstituentById } from "@/lib/constituents/repository";
import { createDraftGift } from "@/lib/gifts/repository";
import type {
	InstallmentStatus,
	Pledge,
	PledgeInstallment,
	PledgeStatus,
} from "./types";
import { INSTALLMENT_STATUSES, PLEDGE_STATUSES } from "./types";

function pledgesTableId(): string {
	return appwriteConfig.pledgesCollectionId || "69d91403001f4e8c2b06";
}

function installmentsTableId(): string {
	return appwriteConfig.pledgeInstallmentsCollectionId || "69d91404001f4e8c2b07";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function isPledgeStatus(value: unknown): value is PledgeStatus {
	return (
		typeof value === "string" &&
		(PLEDGE_STATUSES as readonly string[]).includes(value)
	);
}

function isInstallmentStatus(value: unknown): value is InstallmentStatus {
	return (
		typeof value === "string" &&
		(INSTALLMENT_STATUSES as readonly string[]).includes(value)
	);
}

function mapPledge(row: Record<string, unknown>): Pledge {
	const status = isPledgeStatus(row.status) ? row.status : "active";
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		constituentId: String(row.constituentId || ""),
		totalAmount: Number(row.totalAmount),
		currency: String(row.currency || "USD"),
		status,
	};
}

function mapInstallment(row: Record<string, unknown>): PledgeInstallment {
	const status = isInstallmentStatus(row.status) ? row.status : "pending";
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		pledgeId: String(row.pledgeId || ""),
		dueDate: String(row.dueDate || ""),
		amount: Number(row.amount),
		status,
		giftId: row.giftId ? String(row.giftId) : undefined,
		skipReason: row.skipReason ? String(row.skipReason) : undefined,
	};
}

export async function getPledgeById(
	id: string,
	orgId: string,
): Promise<Pledge | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: pledgesTableId(),
			rowId: id,
		});
		const pledge = mapPledge(row as unknown as Record<string, unknown>);
		if (pledge.orgId !== orgId) return null;
		return pledge;
	} catch {
		return null;
	}
}

export async function createPledgeWithInstallments(input: {
	orgId: string;
	constituentId: string;
	totalAmount: number;
	currency?: string;
	installments: Array<{ dueDate: string; amount: number }>;
}): Promise<{ pledge: Pledge; installments: PledgeInstallment[] }> {
	const constituent = await getConstituentById(input.constituentId);
	if (!constituent || constituent.orgId !== input.orgId) {
		throw new Error("Constituent not found");
	}
	const { tablesDB } = await createAdminClient();
	const pledgeRow = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: pledgesTableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			constituentId: input.constituentId,
			totalAmount: input.totalAmount,
			currency: (input.currency || "USD").toUpperCase(),
			status: "active",
		},
	});
	const pledge = mapPledge(pledgeRow as unknown as Record<string, unknown>);
	const installments: PledgeInstallment[] = [];
	for (const inst of input.installments) {
		const row = await tablesDB.createRow({
			databaseId: dbId(),
			tableId: installmentsTableId(),
			rowId: ID.unique(),
			data: {
				orgId: input.orgId,
				pledgeId: pledge.$id,
				dueDate: inst.dueDate,
				amount: inst.amount,
				status: "pending",
				giftId: null,
				skipReason: null,
			},
		});
		installments.push(mapInstallment(row as unknown as Record<string, unknown>));
	}
	return { pledge, installments };
}

export async function listDueInstallments(
	asOfIso: string,
): Promise<PledgeInstallment[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: installmentsTableId(),
		queries: [
			Query.equal("status", "pending"),
			Query.lessThanEqual("dueDate", asOfIso),
			Query.isNull("giftId"),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapInstallment);
}

export type PledgeCronResult = {
	installmentsProcessed: number;
	draftsCreated: number;
	skippedDnc: number;
};

/** Create at most one draft gift per overdue installment per run (2.8). */
export async function processDuePledgeInstallments(
	asOf = new Date(),
): Promise<PledgeCronResult> {
	const asOfIso = asOf.toISOString();
	const due = await listDueInstallments(asOfIso);
	const { tablesDB } = await createAdminClient();
	let draftsCreated = 0;
	let skippedDnc = 0;

	for (const installment of due) {
		if (installment.giftId) continue;

		const pledge = await getPledgeById(installment.pledgeId, installment.orgId);
		if (!pledge || pledge.status !== "active") continue;

		const constituent = await getConstituentById(pledge.constituentId);
		if (!constituent || !canContact(constituent, "email")) {
			skippedDnc += 1;
			await tablesDB.updateRow({
				databaseId: dbId(),
				tableId: installmentsTableId(),
				rowId: installment.$id,
				data: {
					status: "skipped",
					skipReason: "do_not_contact",
				},
			});
			continue;
		}

		const gift = await createDraftGift({
			orgId: installment.orgId,
			amount: installment.amount,
			currency: pledge.currency,
			giftDate: installment.dueDate,
			method: "other",
			constituentId: pledge.constituentId,
		});
		draftsCreated += 1;
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: installmentsTableId(),
			rowId: installment.$id,
			data: {
				status: "draft_created",
				giftId: gift.$id,
			},
		});
	}

	return {
		installmentsProcessed: due.length,
		draftsCreated,
		skippedDnc,
	};
}

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { createDraftGift, postGift } from "@/lib/gifts/repository";
import { isGiftMethod } from "@/lib/gifts/types";
import {
	createConstituent,
	deleteConstituent,
	updateConstituent,
} from "@/lib/constituents/repository";
import type { ImportRowPlan } from "./dry-run";
import {
	getImportBatch,
	isImportBatchExpired,
	markImportBatchCommitted,
	markImportBatchFailed,
} from "./batch.repository";

export type ImportCommitResult =
	| { ok: true; alreadyCommitted: boolean; counts: Record<string, number> }
	| { ok: false; status: number; error: string };

export async function commitImportBatch(input: {
	orgId: string;
	batchId: string;
}): Promise<ImportCommitResult> {
	const batch = await getImportBatch(input.orgId, input.batchId);
	if (!batch) {
		return { ok: false, status: 404, error: "Import batch not found" };
	}
	if (batch.status === "committed") {
		return {
			ok: true,
			alreadyCommitted: true,
			counts: batch.payload.counts,
		};
	}
	if (isImportBatchExpired(batch)) {
		return { ok: false, status: 410, error: "Import batch expired" };
	}
	if (batch.status === "failed") {
		return { ok: false, status: 409, error: "Import batch previously failed" };
	}

	const blockers = batch.payload.plans.filter(
		(plan) => plan.action === "error" || plan.action === "duplicate",
	);
	if (blockers.length > 0) {
		return {
			ok: false,
			status: 400,
			error: "Resolve duplicate and validation rows before commit",
		};
	}

	const createdConstituentIds: string[] = [];
	const createdGiftIds: string[] = [];

	try {
		for (const plan of batch.payload.plans) {
			await applyPlan(input.orgId, plan, createdConstituentIds, createdGiftIds);
		}
		await markImportBatchCommitted(input.orgId, input.batchId);
		return {
			ok: true,
			alreadyCommitted: false,
			counts: batch.payload.counts,
		};
	} catch (error) {
		await rollbackCreated(input.orgId, createdConstituentIds, createdGiftIds);
		await markImportBatchFailed(input.orgId, input.batchId);
		return {
			ok: false,
			status: 500,
			error: error instanceof Error ? error.message : "Import commit failed",
		};
	}
}

async function applyPlan(
	orgId: string,
	plan: ImportRowPlan,
	createdConstituentIds: string[],
	createdGiftIds: string[],
): Promise<void> {
	if (plan.action === "error" || plan.action === "duplicate") return;

	let constituentId: string;
	if (plan.action === "create") {
		const created = await createConstituent({
			orgId,
			type: plan.row.type,
			firstName: plan.row.firstName,
			lastName: plan.row.lastName,
			email: plan.row.email,
			phone: plan.row.phone,
		});
		constituentId = created.$id;
		createdConstituentIds.push(constituentId);
	} else {
		await updateConstituent(plan.existingConstituentId, {
			type: plan.row.type,
			firstName: plan.row.firstName,
			lastName: plan.row.lastName,
			email: plan.row.email,
			phone: plan.row.phone,
		});
		constituentId = plan.existingConstituentId;
	}

	if (plan.row.giftAmount != null && plan.row.giftDate) {
		const method =
			plan.row.giftMethod && isGiftMethod(plan.row.giftMethod)
				? plan.row.giftMethod
				: "card";
		const draft = await createDraftGift({
			orgId,
			amount: plan.row.giftAmount,
			currency: "USD",
			giftDate: plan.row.giftDate,
			method,
			constituentId,
		});
		createdGiftIds.push(draft.$id);
		await postGift(draft.$id, orgId);
	}
}

async function rollbackCreated(
	orgId: string,
	constituentIds: string[],
	giftIds: string[],
): Promise<void> {
	for (const giftId of giftIds) {
		try {
			const { tablesDB } = await createAdminClient();
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "",
				tableId: appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01",
				rowId: giftId,
			});
		} catch {
			// Best-effort rollback.
		}
	}
	for (const id of constituentIds) {
		try {
			await deleteConstituent(id);
		} catch {
			// Best-effort rollback.
		}
	}
	void orgId;
}

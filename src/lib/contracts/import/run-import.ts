import { getUserByEmail } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ContractService } from "@/lib/api/contracts/services/ContractService";
import {
	indexOrgContracts,
	listOrgContractsLite,
	type OrgContractLite,
} from "@/lib/import/org-contracts";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import type { MappedContractImportRow } from "./parse";

export type ContractImportPlanRow =
	| {
			rowNumber: number;
			action: "update";
			contractId: string;
			fileId?: string;
			patch: Record<string, unknown>;
	  }
	| { rowNumber: number; action: "skip"; reason: string }
	| { rowNumber: number; action: "error"; reason: string };

function daysUntilExpiry(expiryDate: string): number | undefined {
	const expiryStr = expiryDate.split("T")[0];
	const [year, month, day] = expiryStr.split("-").map(Number);
	if (!year || !month || !day) return undefined;
	const expiry = new Date(year, month - 1, day);
	expiry.setHours(0, 0, 0, 0);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
}

function matchContract(
	row: MappedContractImportRow,
	indexed: ReturnType<typeof indexOrgContracts>,
): OrgContractLite | undefined {
	if (row.contractNumber) {
		const byNumber = indexed.byNumber.get(row.contractNumber.toLowerCase());
		if (byNumber) return byNumber;
	}
	if (row.contractName) {
		return indexed.byName.get(row.contractName.toLowerCase());
	}
	return undefined;
}

async function resolveManagerIds(
	orgId: string,
	emails: string[],
): Promise<{ ids: string[]; missing: string[] }> {
	const ids: string[] = [];
	const missing: string[] = [];
	for (const email of emails) {
		const user = await getUserByEmail(email);
		const userId = user ? String((user as { $id?: string }).$id || "") : "";
		if (!userId || !(await validateUserOrgAccess(userId, orgId))) {
			missing.push(email);
			continue;
		}
		ids.push(userId);
	}
	return { ids, missing };
}

async function buildPatch(
	orgId: string,
	row: MappedContractImportRow,
): Promise<
	| { ok: true; patch: Record<string, unknown> }
	| { ok: false; reason: string }
> {
	const patch: Record<string, unknown> = {};
	if (row.vendor) patch.vendor = row.vendor;
	if (row.department) patch.department = row.department;
	if (row.status) patch.status = row.status;
	if (row.contractType) patch.contractType = row.contractType;
	if (row.amount != null) patch.amount = row.amount;
	if (row.contractExpiryDate) {
		patch.contractExpiryDate = row.contractExpiryDate;
		const days = daysUntilExpiry(row.contractExpiryDate);
		if (days != null) patch.daysUntilExpiry = days;
	}
	if (row.assignedManagerEmails.length > 0) {
		const { ids, missing } = await resolveManagerIds(
			orgId,
			row.assignedManagerEmails,
		);
		if (missing.length > 0) {
			return {
				ok: false,
				reason: `Manager email not in this organization: ${missing.join(", ")}`,
			};
		}
		patch.assignedManagers = ids;
	}
	if (Object.keys(patch).length === 0) {
		return { ok: false, reason: "No metadata fields to update" };
	}
	return { ok: true, patch };
}

export async function dryRunContractImport(
	orgId: string,
	rows: MappedContractImportRow[],
): Promise<{
	rows: ContractImportPlanRow[];
	counts: { update: number; skip: number; error: number };
}> {
	const indexed = indexOrgContracts(await listOrgContractsLite(orgId));
	const plans: ContractImportPlanRow[] = [];
	let update = 0;
	let skip = 0;
	let error = 0;
	for (const row of rows) {
		const contract = matchContract(row, indexed);
		if (!contract) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "error",
				reason: "No matching contract in this organization",
			});
			error += 1;
			continue;
		}
		const built = await buildPatch(orgId, row);
		if (!built.ok) {
			if (built.reason.startsWith("No metadata")) {
				plans.push({
					rowNumber: row.rowNumber,
					action: "skip",
					reason: built.reason,
				});
				skip += 1;
			} else {
				plans.push({
					rowNumber: row.rowNumber,
					action: "error",
					reason: built.reason,
				});
				error += 1;
			}
			continue;
		}
		plans.push({
			rowNumber: row.rowNumber,
			action: "update",
			contractId: contract.$id,
			fileId: contract.fileId,
			patch: built.patch,
		});
		update += 1;
	}
	return { rows: plans, counts: { update, skip, error } };
}

export async function commitContractImport(
	orgId: string,
	rows: MappedContractImportRow[],
): Promise<{ updatedCount: number; skippedCount: number; failedCount: number }> {
	const dry = await dryRunContractImport(orgId, rows);
	const { tablesDB } = await createAdminClient();
	let updatedCount = 0;
	let failedCount = 0;
	for (const plan of dry.rows) {
		if (plan.action !== "update") {
			if (plan.action === "error") failedCount += 1;
			continue;
		}
		try {
			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId || "",
				tableId: appwriteConfig.contractsCollectionId || "",
				rowId: plan.contractId,
				data: plan.patch,
			});
			if (plan.fileId) {
				await ContractService.updateFileWithContractMetadata(plan.fileId, {
					$id: plan.contractId,
					...plan.patch,
				});
			}
			updatedCount += 1;
		} catch (error) {
			failedCount += 1;
			console.error("[contracts import commit]", error);
		}
	}
	return {
		updatedCount,
		skippedCount: dry.counts.skip,
		failedCount,
	};
}

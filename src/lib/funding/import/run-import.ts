import { createObligation } from "@/lib/funding/obligation.repository";
import { parseAllowedHttpUrl } from "@/lib/funding/safe-link-url";
import {
	indexOrgContracts,
	listOrgContractsLite,
} from "@/lib/import/org-contracts";
import type { MappedObligationImportRow } from "./parse";

export type ObligationImportPlanRow =
	| {
			rowNumber: number;
			action: "create";
			contractId: string;
			contractName?: string;
			title: string;
			dueDate?: string;
			kind: MappedObligationImportRow["kind"];
			status: MappedObligationImportRow["status"];
			reminderDaysBefore?: number;
			linkUrl?: string;
			description?: string;
	  }
	| { rowNumber: number; action: "error"; reason: string };

export async function dryRunObligationImport(
	orgId: string,
	rows: MappedObligationImportRow[],
): Promise<{
	rows: ObligationImportPlanRow[];
	counts: { create: number; error: number };
}> {
	const indexed = indexOrgContracts(await listOrgContractsLite(orgId));
	const plans: ObligationImportPlanRow[] = [];
	let create = 0;
	let error = 0;
	for (const row of rows) {
		const contract = row.contractId
			? indexed.byId.get(row.contractId)
			: indexed.byNumber.get(row.contractNumber.trim().toLowerCase());
		if (!contract) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "error",
				reason: "No matching contract in this organization",
			});
			error += 1;
			continue;
		}
		let linkUrl: string | undefined;
		if (row.linkUrl) {
			linkUrl = parseAllowedHttpUrl(row.linkUrl);
			if (!linkUrl) {
				plans.push({
					rowNumber: row.rowNumber,
					action: "error",
					reason: "Invalid link URL; use http or https",
				});
				error += 1;
				continue;
			}
		}
		plans.push({
			rowNumber: row.rowNumber,
			action: "create",
			contractId: contract.$id,
			contractName: contract.contractName,
			title: row.title,
			dueDate: row.dueDate,
			kind: row.kind,
			status: row.status,
			reminderDaysBefore: row.reminderDaysBefore,
			linkUrl,
			description: row.description,
		});
		create += 1;
	}
	return { rows: plans, counts: { create, error } };
}

export async function commitObligationImport(
	orgId: string,
	createdByUserId: string,
	ownerName: string,
	rows: MappedObligationImportRow[],
): Promise<{ createdCount: number; skippedCount: number; failedCount: number }> {
	const dry = await dryRunObligationImport(orgId, rows);
	let createdCount = 0;
	let failedCount = 0;
	for (const plan of dry.rows) {
		if (plan.action !== "create") {
			failedCount += 1;
			continue;
		}
		try {
			await createObligation({
				orgId,
				contractId: plan.contractId,
				contractName: plan.contractName,
				title: plan.title,
				description: plan.description,
				kind: plan.kind,
				status: plan.status,
				ownerUserId: createdByUserId,
				ownerName,
				dueDate: plan.dueDate,
				reminderDaysBefore: plan.reminderDaysBefore,
				linkUrl: plan.linkUrl,
				createdByUserId,
			});
			createdCount += 1;
		} catch (error) {
			failedCount += 1;
			console.error("[obligations import commit]", error);
		}
	}
	return { createdCount, skippedCount: 0, failedCount };
}

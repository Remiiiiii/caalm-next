import { Query } from "node-appwrite";
import {
	applyActiveDelegations,
	parseWorkflowState,
	serializeWorkflowState,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import { listActiveDelegations } from "@/lib/approvals/approvalDelegations";
import { notifyApprovalAssignees } from "@/lib/approvals/approvalNotifications";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { excludeSoftDeletedQuery } from "@/lib/soft-delete";

export interface DelegationCronResult {
	scanned: number;
	updated: number;
	notified: number;
}

async function processEntity(
	entityType: "contract" | "license",
	result: DelegationCronResult,
): Promise<void> {
	if (!appwriteConfig.databaseId) return;
	const tableId =
		entityType === "contract"
			? appwriteConfig.contractsCollectionId
			: appwriteConfig.licensesCollectionId;
	if (!tableId) return;

	const { tablesDB } = await createAdminClient();
	const listed = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId,
		queries: [
			Query.or([
				Query.equal("status", "pending-review"),
				Query.equal("status", "action-required"),
			]),
			Query.limit(200),
			excludeSoftDeletedQuery(
				entityType === "contract" ? "contracts" : "licenses",
			),
		],
	});

	for (const row of listed.rows as Array<Record<string, unknown>>) {
		result.scanned += 1;
		const orgId = String(row.orgId || "");
		const state = parseWorkflowState(row.approvalWorkflowState as string);
		if (!state || !orgId) continue;

		const before =
			state.steps[state.currentStepIndex]?.assigneeUserIds || [];
		const next = await applyActiveDelegations(state, orgId, entityType);
		const after =
			next.steps[next.currentStepIndex]?.assigneeUserIds || [];
		const added = after.filter((id) => !before.includes(id));
		if (added.length === 0) continue;

		result.updated += 1;
		await writeRowWithSchemaDriftRecovery({
			tablesDB,
			mode: "update",
			databaseId: appwriteConfig.databaseId,
			tableId,
			rowId: String(row.$id),
			data: {
				approvalWorkflowState: serializeWorkflowState(next),
				currentApprovalStage:
					next.steps[next.currentStepIndex]?.label || "",
			},
		});

		const name =
			entityType === "contract"
				? String(row.contractName || "Contract")
				: String(row.licenseName || "License");
		await notifyApprovalAssignees({
			entityType,
			entityId: String(row.$id),
			userIds: added,
			title: `Delegated approval: ${name}`,
			message: `You were added as an out-of-office delegate for "${name}".`,
		});
		result.notified += added.length;
	}
}

/**
 * Proactively apply active OOO delegations to in-flight approval workflows.
 * Runs alongside the SLA cron so deals keep moving without waiting for a viewer load.
 */
export async function processApprovalDelegations(): Promise<DelegationCronResult> {
	const result: DelegationCronResult = {
		scanned: 0,
		updated: 0,
		notified: 0,
	};
	const active = await listActiveDelegations();
	if (active.length === 0) return result;
	await processEntity("contract", result);
	await processEntity("license", result);
	return result;
}

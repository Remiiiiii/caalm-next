import {
	parseWorkflowState,
	serializeWorkflowState,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { getUserOrganizations } from "@/lib/rbac/permissions";
import { triggerNotification } from "@/lib/utils/notificationTriggers";
import { remapAssignedManagers, remapWorkflowOwnerIds } from "./transfer.logic";

async function assertUserInOrg(userId: string, orgId: string): Promise<void> {
	const orgs = await getUserOrganizations(userId);
	const match = orgs.some((row) => String(row.orgId) === orgId);
	if (!match) {
		throw new Error("Target user must belong to this organization");
	}
}

export async function transferContractOwnership(input: {
	contractId: string;
	orgId: string;
	toUserId: string;
	actorUserId: string;
}): Promise<{ fromUserId: string; toUserId: string }> {
	const { tablesDB } = await createAdminClient();
	const contract = (await tablesDB.getRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: input.contractId,
	})) as Record<string, unknown>;

	if (String(contract.orgId || "") !== input.orgId) {
		throw new Error("Contract not found in this organization");
	}

	const fromUserId = String(
		contract.contractOwnerId || contract.owner || "",
	).trim();
	const toUserId = input.toUserId.trim();
	if (!toUserId) throw new Error("Select a user to transfer to");
	if (fromUserId === toUserId) {
		throw new Error("Contract is already owned by that user");
	}

	await assertUserInOrg(toUserId, input.orgId);

	const data: Record<string, unknown> = {
		contractOwnerId: toUserId,
	};
	if (contract.owner !== undefined) {
		data.owner = toUserId;
	}

	const managers = remapAssignedManagers(
		contract.assignedManagers,
		fromUserId,
		toUserId,
	);
	if (managers) data.assignedManagers = managers;

	const workflow = parseWorkflowState(
		contract.approvalWorkflowState as string | undefined,
	);
	if (workflow && fromUserId) {
		data.approvalWorkflowState = serializeWorkflowState(
			remapWorkflowOwnerIds(workflow, fromUserId, toUserId),
		);
	}

	await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "update",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: input.contractId,
		data,
	});

	const name = String(contract.contractName || "Contract");
	try {
		await triggerNotification("info", {
			userId: toUserId,
			title: `Ownership transferred: ${name}`,
			message: `You are now the owner of "${name}".`,
			priority: "high",
			metadata: {
				contractId: input.contractId,
				actionUrl: `/contracts/${input.contractId}/negotiate`,
				actionText: "Open contract",
				transferredBy: input.actorUserId,
			},
		});
	} catch {
		/* notification is best-effort */
	}

	return { fromUserId, toUserId };
}

export async function transferLicenseOwnership(input: {
	licenseId: string;
	orgId: string;
	toUserId: string;
	actorUserId: string;
}): Promise<{ fromUserId: string; toUserId: string }> {
	const { tablesDB } = await createAdminClient();
	const license = (await tablesDB.getRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.licensesCollectionId!,
		rowId: input.licenseId,
	})) as Record<string, unknown>;

	if (String(license.orgId || "") !== input.orgId) {
		throw new Error("License not found in this organization");
	}

	const fromUserId = String(
		license.licenseOwnerId || license.createdBy || "",
	).trim();
	const toUserId = input.toUserId.trim();
	if (!toUserId) throw new Error("Select a user to transfer to");
	if (fromUserId === toUserId) {
		throw new Error("License is already owned by that user");
	}

	await assertUserInOrg(toUserId, input.orgId);

	const data: Record<string, unknown> = {
		licenseOwnerId: toUserId,
	};

	const managers = remapAssignedManagers(
		license.assignedManagers,
		fromUserId,
		toUserId,
	);
	if (managers) data.assignedManagers = managers;

	const workflow = parseWorkflowState(
		license.approvalWorkflowState as string | undefined,
	);
	if (workflow && fromUserId) {
		data.approvalWorkflowState = serializeWorkflowState(
			remapWorkflowOwnerIds(workflow, fromUserId, toUserId),
		);
	}

	await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "update",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.licensesCollectionId!,
		rowId: input.licenseId,
		data,
	});

	const name = String(license.licenseName || "License");
	try {
		await triggerNotification("info", {
			userId: toUserId,
			title: `Ownership transferred: ${name}`,
			message: `You are now the owner of "${name}".`,
			priority: "high",
			metadata: {
				licenseId: input.licenseId,
				actionUrl: "/licenses",
				actionText: "Open licenses",
				transferredBy: input.actorUserId,
			},
		});
	} catch {
		/* notification is best-effort */
	}

	return { fromUserId, toUserId };
}

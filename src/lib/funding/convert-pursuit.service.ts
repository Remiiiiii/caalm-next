import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getPursuitById, updatePursuit } from "./pursuit.repository";
import type { FundingPursuit } from "./types";

export type ConvertPursuitResult = {
	pursuit: FundingPursuit;
	proposalId: string;
	alreadyLinked: boolean;
};

/**
 * When a pursuit is won, spawn a draft contract that shows up in
 * Proposals & Approvals — pre-filled with dollar value and source context.
 * Retention later picks it up automatically once that proposal becomes an
 * active contract with an expiry date (Retention only reads Contracts).
 */
export async function convertWonPursuitToProposal(input: {
	pursuitId: string;
	orgId: string;
	userId: string;
}): Promise<ConvertPursuitResult> {
	const pursuit = await getPursuitById(input.pursuitId);
	if (!pursuit) throw new Error("Pursuit not found");
	if (pursuit.orgId !== input.orgId) {
		throw new Error("Pursuit does not belong to this organization");
	}
	if (pursuit.linkedProposalId) {
		return {
			pursuit,
			proposalId: pursuit.linkedProposalId,
			alreadyLinked: true,
		};
	}

	const { tablesDB } = await createAdminClient();
	const contractsTable =
		appwriteConfig.contractsCollectionId || "test-contracts";

	const descriptionParts = [
		`Spawned from Funding Pursuit "${pursuit.title}".`,
		`Estimated value: ${pursuit.currency} ${pursuit.amount}.`,
		pursuit.source === "sam_gov" && pursuit.samNoticeId
			? `SAM.gov notice: ${pursuit.samNoticeId}.`
			: null,
		pursuit.samUrl ? `Source URL: ${pursuit.samUrl}` : null,
		pursuit.notes ? `Pursuit notes: ${pursuit.notes}` : null,
	].filter(Boolean);

	const proposalId = ID.unique();
	await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "",
		tableId: contractsTable,
		rowId: proposalId,
		data: {
			contractName: pursuit.title.slice(0, 256),
			orgId: input.orgId,
			amount: pursuit.amount,
			currencyCode: pursuit.currency || "USD",
			lifecycleStatus: "draft",
			status: "pending-review",
			description: descriptionParts.join(" ").slice(0, 5000),
			contractOwnerId: pursuit.ownerUserId || input.userId,
			department: pursuit.department,
			vendor: pursuit.source === "sam_gov" ? "SAM.gov opportunity" : undefined,
			contractType: "other",
			priority: pursuit.amount >= 50000 ? "High" : "Medium",
		},
	});

	const updated = await updatePursuit(input.pursuitId, {
		stage: "won",
		linkedProposalId: proposalId,
	});

	return { pursuit: updated, proposalId, alreadyLinked: false };
}

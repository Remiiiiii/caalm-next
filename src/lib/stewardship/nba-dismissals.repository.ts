import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { NextBestActionKind } from "@/lib/fundraising/next-best-action";
import { NBA_DISMISS_COOLDOWN_DAYS } from "./constants";

export type NbaDismissalRow = {
	$id: string;
	orgId: string;
	constituentId: string;
	userId: string;
	actionKind: NextBestActionKind;
	reason: string;
	dismissedAt: string;
	cooldownUntil: string;
};

function tableId(): string {
	return (
		appwriteConfig.stewardshipNbaDismissalsCollectionId ||
		"69f7b301001f4e8c2b50"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): NbaDismissalRow {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		constituentId: String(row.constituentId || ""),
		userId: String(row.userId || ""),
		actionKind: String(row.actionKind || "call") as NextBestActionKind,
		reason: String(row.reason || ""),
		dismissedAt: String(row.dismissedAt || ""),
		cooldownUntil: String(row.cooldownUntil || ""),
	};
}

export async function listActiveDismissalsForConstituent(input: {
	orgId: string;
	constituentId: string;
	userId: string;
	asOf?: Date;
}): Promise<NbaDismissalRow[]> {
	const asOfIso = (input.asOf ?? new Date()).toISOString();
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", input.orgId),
			Query.equal("constituentId", input.constituentId),
			Query.equal("userId", input.userId),
			Query.greaterThan("cooldownUntil", asOfIso),
			Query.limit(20),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function dismissNextBestAction(input: {
	orgId: string;
	constituentId: string;
	userId: string;
	actionKind: NextBestActionKind;
	reason: string;
}): Promise<NbaDismissalRow> {
	const trimmed = input.reason.trim();
	if (trimmed.length < 3) {
		throw new Error("Dismiss reason is required");
	}
	const dismissedAt = new Date();
	const cooldownUntil = new Date(dismissedAt);
	cooldownUntil.setDate(cooldownUntil.getDate() + NBA_DISMISS_COOLDOWN_DAYS);

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			constituentId: input.constituentId,
			userId: input.userId,
			actionKind: input.actionKind,
			reason: trimmed,
			dismissedAt: dismissedAt.toISOString(),
			cooldownUntil: cooldownUntil.toISOString(),
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

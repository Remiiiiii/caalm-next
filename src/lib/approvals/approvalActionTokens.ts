import { createHash, randomBytes } from "node:crypto";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ApprovalActionToken {
	$id: string;
	tokenHash: string;
	entityType: "contract" | "license";
	entityId: string;
	userId: string;
	expiresAt: string;
	usedAt?: string;
}

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function rowToToken(row: Record<string, unknown>): ApprovalActionToken {
	return {
		$id: String(row.$id),
		tokenHash: String(row.tokenHash || ""),
		entityType: (row.entityType as "contract" | "license") || "contract",
		entityId: String(row.entityId || ""),
		userId: String(row.userId || ""),
		expiresAt: String(row.expiresAt || ""),
		usedAt: row.usedAt ? String(row.usedAt) : undefined,
	};
}

export async function issueApprovalActionToken(input: {
	entityType: "contract" | "license";
	entityId: string;
	userId: string;
}): Promise<string> {
	const token = randomBytes(32).toString("hex");
	const { tablesDB } = await createAdminClient();
	await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "create",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.approvalActionTokensCollectionId,
		rowId: ID.unique(),
		data: {
			tokenHash: hashToken(token),
			entityType: input.entityType,
			entityId: input.entityId,
			userId: input.userId,
			expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
		},
	});
	return token;
}

export async function resolveApprovalActionToken(
	token: string,
): Promise<ApprovalActionToken | null> {
	const collectionId = appwriteConfig.approvalActionTokensCollectionId;
	if (!collectionId || !token) return null;
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			queries: [Query.equal("tokenHash", hashToken(token)), Query.limit(1)],
		});
		const row = result.rows?.[0] as Record<string, unknown> | undefined;
		if (!row) return null;
		const parsed = rowToToken(row);
		if (parsed.usedAt) return null;
		if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
		return parsed;
	} catch {
		return null;
	}
}

export async function markApprovalActionTokenUsed(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "update",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.approvalActionTokensCollectionId,
		rowId: id,
		data: { usedAt: new Date().toISOString() },
	});
}

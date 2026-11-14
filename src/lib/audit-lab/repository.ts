import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { ReviewSession } from "./types";

function dbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

async function tables() {
	const { tablesDB } = await createAdminClient();
	return tablesDB;
}

export async function createSessionRow(
	data: Omit<ReviewSession, "$id" | "$createdAt" | "$updatedAt">,
): Promise<ReviewSession> {
	const tablesDB = await tables();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionsCollectionId,
		rowId: ID.unique(),
		data,
	});
	return row as unknown as ReviewSession;
}

export async function getSession(
	orgId: string,
	sessionId: string,
): Promise<ReviewSession | null> {
	try {
		const tablesDB = await tables();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: appwriteConfig.reviewSessionsCollectionId,
			rowId: sessionId,
		});
		const session = row as unknown as ReviewSession;
		if (session.orgId !== orgId) return null;
		return session;
	} catch {
		return null;
	}
}

export async function listSessions(
	orgId: string,
	limit = 50,
): Promise<ReviewSession[]> {
	const tablesDB = await tables();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionsCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.orderDesc("$createdAt"),
			Query.limit(limit),
		],
	});
	return result.rows as unknown as ReviewSession[];
}

export async function updateSessionRow(
	sessionId: string,
	data: Partial<
		Pick<
			ReviewSession,
			"scheduledAt" | "status" | "participantsJson" | "title" | "department"
		>
	>,
): Promise<ReviewSession> {
	const tablesDB = await tables();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: appwriteConfig.reviewSessionsCollectionId,
		rowId: sessionId,
		data,
	});
	return row as unknown as ReviewSession;
}

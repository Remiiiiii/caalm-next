import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import CacheManager from "@/lib/services/cache-manager";

export class DiagramPositionError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "DiagramPositionError";
		this.status = status;
	}
}

function db() {
	return appwriteConfig.databaseId || "default-db";
}

function usersTable() {
	return appwriteConfig.usersCollectionId || "users";
}

export function diagramPositionFields(
	x: number,
	y: number,
): { diagramPositionX: number; diagramPositionY: number } {
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		throw new DiagramPositionError("Position x and y must be finite numbers");
	}
	return { diagramPositionX: x, diagramPositionY: y };
}

export async function updateDiagramPosition(input: {
	userId: string;
	x: number;
	y: number;
}): Promise<{ x: number; y: number }> {
	const fields = diagramPositionFields(input.x, input.y);

	const { tablesDB } = await createAdminClient();
	let rowId = input.userId;
	let email: string | undefined;
	let accountId: string | undefined;
	let fullName: string | undefined;

	try {
		const row = await tablesDB.getRow({
			databaseId: db(),
			tableId: usersTable(),
			rowId: input.userId,
		});
		rowId = row.$id;
		email = (row as { email?: string }).email;
		accountId = (row as { accountId?: string }).accountId;
		fullName = (row as { fullName?: string }).fullName;
	} catch {
		const listed = await tablesDB.listRows({
			databaseId: db(),
			tableId: usersTable(),
			queries: [Query.equal("accountId", input.userId), Query.limit(1)],
		});
		if (!listed.rows[0]) {
			throw new DiagramPositionError("User not found", 404);
		}
		rowId = listed.rows[0].$id;
		email = (listed.rows[0] as { email?: string }).email;
		accountId = (listed.rows[0] as { accountId?: string }).accountId;
		fullName = (listed.rows[0] as { fullName?: string }).fullName;
	}

	await tablesDB.updateRow({
		databaseId: db(),
		tableId: usersTable(),
		rowId,
		data: fields,
	});

	await CacheManager.invalidateUsers(email, rowId, accountId, fullName);

	return { x: input.x, y: input.y };
}

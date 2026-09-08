import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function loadContractForOrg(contractId: string, orgId: string) {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.getRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: contractId,
	});
	const rowOrg = String(row.orgId || "");
	if (rowOrg && rowOrg !== orgId) {
		throw new Error("Contract not found");
	}
	return row as Record<string, unknown> & { $id: string };
}

export function versionsTable(): string {
	return appwriteConfig.contractDocumentVersionsCollectionId;
}

export function commentsTable(): string {
	return appwriteConfig.contractNegotiationCommentsCollectionId;
}

export function accessTable(): string {
	return appwriteConfig.contractNegotiationAccessCollectionId;
}

export function dbId(): string {
	return appwriteConfig.databaseId || "";
}

export { Query };

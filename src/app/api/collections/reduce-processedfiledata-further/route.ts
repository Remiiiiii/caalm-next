import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

const CONTRACT_DRAFTS_COLLECTION_ID = "692f4a86002ae8f45cae";

export async function POST(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.IT.MANAGE_DATABASE,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		if (!appwriteConfig.databaseId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		const { databases, tablesDB } = await createAdminClient();

		const result: any = {
			steps: [] as string[],
			errors: [] as string[],
		};

		// Reduce processedFileData from 10KB to 5KB
		result.steps.push("Reducing processedFileData from 10KB to 5KB...");

		// Backup values
		const allDrafts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: CONTRACT_DRAFTS_COLLECTION_ID,
			queries: [],
		});

		const backups: Record<string, any> = {};
		for (const draft of allDrafts.rows) {
			if (draft.processedFileData) {
				backups[draft.$id] = draft.processedFileData;
			}
		}
		result.steps.push(`✓ Backed up ${Object.keys(backups).length} draft(s)`);

		// Delete old attribute
		await tablesDB.deleteColumn({
			databaseId: appwriteConfig.databaseId,
			tableId: CONTRACT_DRAFTS_COLLECTION_ID,
			key: "processedFileData",
		});
		result.steps.push("✓ Deleted old processedFileData");

		// Create new smaller attribute (5KB)
		await databases.createStringAttribute(
			appwriteConfig.databaseId,
			CONTRACT_DRAFTS_COLLECTION_ID,
			"processedFileData",
			5120, // 5KB
			false, // not required
			"", // default
			false, // not array
		);
		result.steps.push("✓ Created new processedFileData (5KB)");

		// Restore values
		let restored = 0;
		let truncated = 0;
		for (const [draftId, value] of Object.entries(backups)) {
			const valueString =
				typeof value === "string" ? value : JSON.stringify(value);
			if (valueString.length <= 5120) {
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: CONTRACT_DRAFTS_COLLECTION_ID,
					rowId: draftId,
					data: { processedFileData: valueString },
				});
				restored++;
			} else {
				const truncatedValue = valueString.substring(0, 5020); // Leave buffer
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: CONTRACT_DRAFTS_COLLECTION_ID,
					rowId: draftId,
					data: { processedFileData: truncatedValue },
				});
				truncated++;
			}
		}
		result.steps.push(`✓ Restored ${restored}, truncated ${truncated}`);

		return NextResponse.json({
			success: true,
			message: "Reduced processedFileData to 5KB",
			result,
		});
	} catch (error: any) {
		console.error("Error reducing processedFileData:", error);
		return NextResponse.json(
			{
				error: "Failed to reduce processedFileData",
				message: error.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

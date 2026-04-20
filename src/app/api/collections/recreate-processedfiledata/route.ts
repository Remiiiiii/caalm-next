import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

const CONTRACT_DRAFTS_COLLECTION_ID = "692f4a86002ae8f45cae";

export async function POST(_request: NextRequest) {
	try {
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

		// Step 1: Backup all processedFileData values
		result.steps.push("Step 1: Backing up processedFileData values...");
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

		// Step 2: Delete the old processedFileData attribute
		result.steps.push("Step 2: Deleting old processedFileData attribute...");
		try {
			await tablesDB.deleteColumn({
				databaseId: appwriteConfig.databaseId,
				tableId: CONTRACT_DRAFTS_COLLECTION_ID,
				key: "processedFileData",
			});
			result.steps.push("✓ Deleted old processedFileData attribute");
		} catch (error: any) {
			result.errors.push(
				`Failed to delete processedFileData: ${error.message}`,
			);
			throw error;
		}

		// Step 3: Create new processedFileData attribute with smaller size (10KB instead of 1MB)
		result.steps.push(
			"Step 3: Creating new processedFileData attribute (10KB)...",
		);
		try {
			await databases.createStringAttribute(
				appwriteConfig.databaseId,
				CONTRACT_DRAFTS_COLLECTION_ID,
				"processedFileData",
				10240, // 10KB instead of 1MB
				false, // not required
				"", // no default
				false, // not array
			);
			result.steps.push("✓ Created new processedFileData attribute (10KB)");
		} catch (error: any) {
			result.errors.push(
				`Failed to create new processedFileData: ${error.message}`,
			);
			throw error;
		}

		// Step 4: Restore backed up values (only if they fit in 10KB)
		result.steps.push("Step 4: Restoring processedFileData values...");
		let restored = 0;
		let skipped = 0;
		for (const [draftId, value] of Object.entries(backups)) {
			try {
				// Check if value fits in 10KB
				const valueString =
					typeof value === "string" ? value : JSON.stringify(value);
				if (valueString.length <= 10240) {
					await tablesDB.updateRow({
						databaseId: appwriteConfig.databaseId,
						tableId: CONTRACT_DRAFTS_COLLECTION_ID,
						rowId: draftId,
						data: { processedFileData: valueString },
					});
					restored++;
				} else {
					// Value is too large, skip it (shouldn't happen if optimization worked)
					skipped++;
					result.steps.push(
						`⚠ Skipped draft ${draftId} - value too large (${valueString.length} bytes)`,
					);
				}
			} catch (error: any) {
				result.errors.push(
					`Failed to restore draft ${draftId}: ${error.message}`,
				);
			}
		}
		result.steps.push(
			`✓ Restored ${restored} draft(s), skipped ${skipped} draft(s)`,
		);

		return NextResponse.json({
			success: true,
			message:
				"Successfully recreated processedFileData attribute with smaller size",
			result,
		});
	} catch (error: any) {
		console.error("Error recreating processedFileData attribute:", error);
		return NextResponse.json(
			{
				error: "Failed to recreate processedFileData attribute",
				message: error.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

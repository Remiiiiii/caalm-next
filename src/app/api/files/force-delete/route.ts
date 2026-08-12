import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Force delete endpoint that tries multiple deletion strategies
 * to work around Appwrite's two-way relationship constraints
 */
export async function POST(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.PLATFORM.FORCE_DELETE,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const { searchParams } = new URL(request.url);
		const fileId = searchParams.get("fileId");

		if (!fileId) {
			return NextResponse.json(
				{ error: "fileId query parameter is required" },
				{ status: 400 },
			);
		}

		const { tablesDB, storage } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		const result: any = {
			fileId,
			attempts: [] as any[],
			success: false,
		};

		// Get the file first
		let file;
		try {
			file = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.filesCollectionId,
				rowId: fileId,
			});
			result.fileName = file.name;
		} catch (error: any) {
			return NextResponse.json({
				success: false,
				error: `File not found: ${error.message}`,
			});
		}

		// Strategy 1: Try deleting storage file first, then document
		result.attempts.push({
			strategy: "1: Delete storage first, then document",
		});
		try {
			if (file.bucketFileId) {
				try {
					await storage.deleteFile({
						bucketId: appwriteConfig.bucketId!,
						fileId: file.bucketFileId,
					});
					result.attempts[result.attempts.length - 1].storageDeleted = true;
				} catch (storageError: any) {
					result.attempts[result.attempts.length - 1].storageError =
						storageError.message;
					// Continue anyway - storage might already be deleted
				}
			}

			// Wait a moment
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Now try to delete the document
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.filesCollectionId,
				rowId: fileId,
			});

			result.attempts[result.attempts.length - 1].success = true;
			result.success = true;
			return NextResponse.json(result);
		} catch (error: any) {
			result.attempts[result.attempts.length - 1].error = error.message;
			result.attempts[result.attempts.length - 1].errorDetails = {
				code: error?.code,
				type: error?.type,
			};
		}

		// Strategy 2: Try to update user document to force relationship refresh
		if (file.owner) {
			const ownerId =
				typeof file.owner === "string" ? file.owner : file.owner.$id;
			result.attempts.push({
				strategy: "2: Update user to refresh relationship, then delete",
			});

			try {
				// Get user
				const user = await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.usersCollectionId!,
					rowId: ownerId,
				});

				// Update user with a timestamp change to force relationship recalculation
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.usersCollectionId!,
					rowId: ownerId,
					data: {
						// Update a field that won't change the actual value but triggers a save
						status: user.status || "active",
					},
				});

				result.attempts[result.attempts.length - 1].userUpdated = true;

				// Wait for relationship to refresh
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Try deletion again
				await tablesDB.deleteRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.filesCollectionId,
					rowId: fileId,
				});

				result.attempts[result.attempts.length - 1].success = true;
				result.success = true;
				return NextResponse.json(result);
			} catch (error: any) {
				result.attempts[result.attempts.length - 1].error = error.message;
				result.attempts[result.attempts.length - 1].errorDetails = {
					code: error?.code,
					type: error?.type,
				};
			}
		}

		// Strategy 3: Try deleting with all relationships explicitly nulled
		result.attempts.push({
			strategy: "3: Null all relationships, then delete",
		});
		try {
			// Ensure all relationship fields are null
			const nullData: any = {
				owner: null,
				contractId: null,
			};

			await tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.filesCollectionId,
				rowId: fileId,
				data: nullData,
			});

			result.attempts[result.attempts.length - 1].relationshipsNulled = true;

			// Wait
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Try deletion
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.filesCollectionId,
				rowId: fileId,
			});

			result.attempts[result.attempts.length - 1].success = true;
			result.success = true;
			return NextResponse.json(result);
		} catch (error: any) {
			result.attempts[result.attempts.length - 1].error = error.message;
			result.attempts[result.attempts.length - 1].errorDetails = {
				code: error?.code,
				type: error?.type,
			};
		}

		// All strategies failed
		return NextResponse.json({
			success: false,
			result,
			message:
				"All deletion strategies failed. This appears to be an Appwrite internal constraint issue with two-way relationships.",
		});
	} catch (error: any) {
		console.error("Force delete error:", error);
		return NextResponse.json(
			{
				error: "Force delete failed",
				message: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

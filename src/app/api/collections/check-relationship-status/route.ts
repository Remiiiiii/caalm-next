import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.IT.MANAGE_DATABASE,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const { searchParams } = new URL(request.url);
		const collectionId = searchParams.get("collectionId");
		const _attributeKey = searchParams.get("attributeKey");

		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		const result: any = {
			timestamp: new Date().toISOString(),
			checks: [] as any[],
		};

		// Check users collection files attribute
		if (!collectionId || collectionId === "685ed8a60030f6d7b1f3") {
			try {
				// Try to get the attribute directly using getColumn
				let filesAttribute;
				try {
					filesAttribute = await tablesDB.getColumn({
						databaseId: appwriteConfig.databaseId,
						tableId: "685ed8a60030f6d7b1f3",
						key: "files",
					});
				} catch (_getError: any) {
					// If getColumn fails, try getting the collection
					const usersCollection = await (tablesDB as any).getCollection?.({
						databaseId: appwriteConfig.databaseId,
						collectionId: "685ed8a60030f6d7b1f3",
					});
					filesAttribute = usersCollection?.attributes?.find(
						(attr: any) => attr.key === "files",
					);
				}

				result.checks.push({
					collection: "users (685ed8a60030f6d7b1f3)",
					attribute: "files",
					status: filesAttribute?.status || "not found",
					error: filesAttribute?.error || null,
					relatedCollection: filesAttribute?.relatedCollection || null,
					relationType: filesAttribute?.relationType || null,
					twoWay: filesAttribute?.twoWay || null,
					twoWayKey: filesAttribute?.twoWayKey || null,
					onDelete: filesAttribute?.onDelete || null,
					createdAt: filesAttribute?.$createdAt || null,
					updatedAt: filesAttribute?.$updatedAt || null,
				});
			} catch (error: any) {
				result.checks.push({
					collection: "users (685ed8a60030f6d7b1f3)",
					attribute: "files",
					error: error.message,
				});
			}
		}

		// Check Files collection owner attribute
		if (!collectionId || collectionId === "6934a3120033b4a5c4da") {
			try {
				// Try to get the attribute directly using getColumn
				let ownerAttribute;
				try {
					ownerAttribute = await tablesDB.getColumn({
						databaseId: appwriteConfig.databaseId,
						tableId: "6934a3120033b4a5c4da",
						key: "owner",
					});
				} catch (_getError: any) {
					// If getColumn fails, try getting the collection
					const filesCollection = await (tablesDB as any).getCollection?.({
						databaseId: appwriteConfig.databaseId,
						collectionId: "6934a3120033b4a5c4da",
					});
					ownerAttribute = filesCollection?.attributes?.find(
						(attr: any) => attr.key === "owner",
					);
				}

				result.checks.push({
					collection: "Files (6934a3120033b4a5c4da)",
					attribute: "owner",
					status: ownerAttribute?.status || "not found",
					error: ownerAttribute?.error || null,
					relatedCollection: ownerAttribute?.relatedCollection || null,
					relationType: ownerAttribute?.relationType || null,
					twoWay: ownerAttribute?.twoWay || null,
					twoWayKey: ownerAttribute?.twoWayKey || null,
					onDelete: ownerAttribute?.onDelete || null,
					createdAt: ownerAttribute?.$createdAt || null,
					updatedAt: ownerAttribute?.$updatedAt || null,
				});
			} catch (error: any) {
				result.checks.push({
					collection: "Files (6934a3120033b4a5c4da)",
					attribute: "owner",
					error: error.message,
				});
			}
		}

		// Check old files collection owner attribute (for comparison)
		try {
			let oldOwnerAttribute;
			try {
				oldOwnerAttribute = await tablesDB.getColumn({
					databaseId: appwriteConfig.databaseId,
					tableId: "685ed9e90020d8f09173",
					key: "owner",
				});
			} catch (_getError: any) {
				// If getColumn fails, skip this check
				oldOwnerAttribute = null;
			}

			result.checks.push({
				collection: "files (old) (685ed9e90020d8f09173)",
				attribute: "owner",
				status:
					(oldOwnerAttribute as { status?: string } | null)?.status ||
					"not found",
				relatedCollection:
					(oldOwnerAttribute as { relatedCollection?: string | null } | null)
						?.relatedCollection || null,
				note: "This is the old collection for comparison",
			});
		} catch (_error: any) {
			// Ignore errors for old collection
		}

		// Summary
		const processingAttributes = result.checks.filter(
			(check: any) => check.status === "processing",
		);
		const availableAttributes = result.checks.filter(
			(check: any) => check.status === "available",
		);
		const errorAttributes = result.checks.filter(
			(check: any) => check.error || check.status === "failed",
		);

		result.summary = {
			total: result.checks.length,
			processing: processingAttributes.length,
			available: availableAttributes.length,
			errors: errorAttributes.length,
			processingAttributes: processingAttributes.map((a: any) => ({
				collection: a.collection,
				attribute: a.attribute,
				error: a.error,
			})),
			errorAttributes: errorAttributes.map((a: any) => ({
				collection: a.collection,
				attribute: a.attribute,
				error: a.error,
			})),
		};

		return NextResponse.json({
			success: true,
			result,
		});
	} catch (error: any) {
		console.error("Check relationship status error:", error);
		return NextResponse.json(
			{
				error: "Failed to check relationship status",
				message: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

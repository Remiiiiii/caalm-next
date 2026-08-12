import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.PLATFORM.MANAGE_SCHEMA,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const { collectionId, attributeKey } = await request.json();

		if (!collectionId || !attributeKey) {
			return NextResponse.json(
				{ error: "collectionId and attributeKey are required" },
				{ status: 400 },
			);
		}

		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		const result: any = {
			collectionId,
			attributeKey,
			timestamp: new Date().toISOString(),
			steps: [] as string[],
		};

		try {
			result.steps.push(
				`Attempting to delete attribute "${attributeKey}" from collection "${collectionId}"...`,
			);

			// Delete the attribute using deleteColumn
			await tablesDB.deleteColumn({
				databaseId: appwriteConfig.databaseId,
				tableId: collectionId,
				key: attributeKey,
			});

			result.steps.push(`✓ Successfully deleted attribute "${attributeKey}"`);
			result.success = true;

			return NextResponse.json({
				success: true,
				result,
			});
		} catch (error: any) {
			result.steps.push(`✗ Failed to delete attribute: ${error.message}`);
			result.error = error.message;
			result.errorDetails = {
				code: error?.code,
				type: error?.type,
				response: error?.response,
			};

			return NextResponse.json(
				{
					success: false,
					result,
				},
				{ status: 500 },
			);
		}
	} catch (error: any) {
		console.error("Delete attribute error:", error);
		return NextResponse.json(
			{
				error: "Failed to delete attribute",
				message: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const collectionId = searchParams.get("collectionId");

		if (!collectionId) {
			return NextResponse.json(
				{ error: "Collection ID is required" },
				{ status: 400 },
			);
		}

		if (!appwriteConfig.databaseId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		const { tablesDB } = await createAdminClient();

		// List the table columns to see all attributes
		const columns = await tablesDB.listColumns({
			databaseId: appwriteConfig.databaseId,
			tableId: collectionId,
		});

		return NextResponse.json({
			success: true,
			collectionId,
			totalAttributes: columns.total || 0,
			attributes: columns.columns || [],
		});
	} catch (error: any) {
		console.error("Error listing attributes:", error);
		return NextResponse.json(
			{
				error: "Failed to list attributes",
				message: error.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

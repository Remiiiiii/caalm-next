import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

const CONTRACT_DRAFTS_COLLECTION_ID = "692f4a86002ae8f45cae";
const CONTRACTS_COLLECTION_ID = "6912e5a400789ef12345";

export async function POST(_request: NextRequest) {
	try {
		if (!appwriteConfig.databaseId) {
			return NextResponse.json(
				{ error: "Database ID is not configured" },
				{ status: 500 },
			);
		}

		// Use the Databases class which has createRelationshipAttribute method
		const { databases } = await createAdminClient();

		// Create a oneToOne relationship from Contract Drafts to Contracts
		// This allows us to link a draft to its completed contract
		try {
			const relationship = await databases.createRelationshipAttribute(
				appwriteConfig.databaseId,
				CONTRACT_DRAFTS_COLLECTION_ID,
				CONTRACTS_COLLECTION_ID,
				"oneToOne", // type
				false, // twoWay
				"contractId", // key
				undefined, // twoWayKey (not needed for one-way)
				"setNull", // onDelete - if contract is deleted, set draft.contractId to null
			);

			return NextResponse.json({
				success: true,
				message: "Relationship created successfully",
				relationship: {
					key: relationship.key,
					type: relationship.type,
					relatedCollectionId: relationship.relatedCollection,
				},
				databaseId: appwriteConfig.databaseId,
			});
		} catch (error: any) {
			// If relationship already exists, that's okay
			if (error.code === 409 || error.message?.includes("already exists")) {
				return NextResponse.json({
					success: true,
					message: "Relationship already exists",
					warning: error.message,
				});
			}

			throw error;
		}
	} catch (error: any) {
		console.error("Error creating relationship:", error);
		return NextResponse.json(
			{
				error: "Failed to create relationship",
				message: error.message || "Unknown error",
				code: error.code,
				type: error.type,
				response: error.response,
				stack: error.stack,
				details: error,
			},
			{ status: 500 },
		);
	}
}

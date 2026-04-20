/**
 * Script to verify and create the Contract Drafts collection
 * Run with: npx tsx src/scripts/verify-contract-drafts-collection.ts
 */

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

async function verifyCollection() {
	try {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId) {
			console.error("Database ID not configured");
			return;
		}

		const collectionId =
			appwriteConfig.contractDraftsCollectionId || "692f4a86002ae8f45cae";

		console.log("Verifying collection:", collectionId);

		// Try to get the collection
		try {
			const collection = await tablesDB.getCollection({
				databaseId: appwriteConfig.databaseId,
				collectionId: collectionId,
			});
			console.log("Collection exists:", collection.name);

			// List attributes
			const attributes = await tablesDB.listAttributes({
				databaseId: appwriteConfig.databaseId,
				collectionId: collectionId,
			});
			console.log(
				"Collection attributes:",
				attributes.attributes.map((a: any) => a.key),
			);
		} catch (error: any) {
			if (error.code === 404) {
				console.log(
					"Collection does not exist. Please create it in Appwrite console with:",
				);
				console.log("Collection ID: 692f4a86002ae8f45cae");
				console.log("Required attributes:");
				console.log("- ownerId (string, required)");
				console.log("- accountId (string, required)");
				console.log("- formData (string, required)");
				console.log("- currentStep (integer, required)");
				console.log("- processedFileData (string, optional)");
				console.log("- extractedData (string, optional)");
				console.log("- progressPercentage (integer, required)");
				console.log("- lastSavedAt (datetime, required)");
				console.log("- isCompleted (boolean, default: false)");
			} else {
				console.error("Error checking collection:", error);
			}
		}
	} catch (error) {
		console.error("Error:", error);
	}
}

verifyCollection();

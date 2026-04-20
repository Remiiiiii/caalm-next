import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function POST(_request: NextRequest) {
	try {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.contractsCollectionId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		// Find all contracts that have a fileRef relationship
		const contractsWithFileRef = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			queries: [Query.isNotNull("fileRef"), Query.limit(1000)],
		});

		const totalContracts = contractsWithFileRef.total;
		const contracts = contractsWithFileRef.rows;

		console.log(`Found ${totalContracts} contracts with fileRef relationships`);

		const results = {
			total: totalContracts,
			cleared: 0,
			failed: 0,
			errors: [] as string[],
		};

		// Process contracts in batches
		const batchSize = 50;
		for (let i = 0; i < contracts.length; i += batchSize) {
			const batch = contracts.slice(i, i + batchSize);

			await Promise.all(
				batch.map(async (contract) => {
					try {
						// Clear the fileRef relationship by setting it to null
						await tablesDB.updateRow({
							databaseId: appwriteConfig.databaseId!,
							tableId: appwriteConfig.contractsCollectionId!,
							rowId: contract.$id,
							data: {
								fileRef: null,
							},
						});

						results.cleared++;
						console.log(`Cleared fileRef for contract ${contract.$id}`);
					} catch (error: any) {
						results.failed++;
						const errorMsg = `Contract ${contract.$id}: ${error?.message || "Unknown error"}`;
						results.errors.push(errorMsg);
						console.error(errorMsg, error);
					}
				}),
			);

			// Small delay between batches
			if (i + batchSize < contracts.length) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		return NextResponse.json({
			success: true,
			message: `Cleared fileRef relationships: ${results.cleared} cleared, ${results.failed} failed out of ${results.total} total`,
			results,
		});
	} catch (error: any) {
		console.error("Clear fileRef error:", error);
		return NextResponse.json(
			{
				error: "Failed to clear fileRef relationships",
				message: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// GET endpoint to check how many contracts have fileRef
export async function GET() {
	try {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.contractsCollectionId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		// Count contracts with fileRef
		const contractsWithFileRef = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			queries: [Query.isNotNull("fileRef"), Query.limit(1)],
		});

		// Get total contract count
		const allContracts = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			queries: [Query.limit(1)],
		});

		return NextResponse.json({
			totalContracts: allContracts.total,
			contractsWithFileRef: contractsWithFileRef.total,
			needsClearing: contractsWithFileRef.total > 0,
		});
	} catch (error: any) {
		console.error("Check error:", error);
		return NextResponse.json(
			{
				error: "Failed to check fileRef status",
				message: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

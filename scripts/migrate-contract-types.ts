/**
 * Migration Script: Contract Types
 *
 * Migrates existing contracts to the new type system by mapping old contractType values
 * to the new selectedContractType field.
 *
 * Run with: npx tsx scripts/migrate-contract-types.ts
 */

import { Query } from "node-appwrite";
import { createAdminClient } from "../src/lib/appwrite";
import { appwriteConfig } from "../src/lib/appwrite/config";

// Mapping from old contract types to new type IDs
const CONTRACT_TYPE_MAPPING: Record<string, string> = {
	"Service Agreement": "vendor",
	"Professional Services": "consulting",
	"Purchase Agreement": "vendor",
	"Purchase Order": "vendor",
	"Lease Agreement": "lease",
	"License Agreement": "vendor",
	"Employment Contract": "employment",
	"Confidentiality/NDA": "vendor",
	NDA: "vendor",
	"Vendor Contract": "vendor",
	"Consulting Agreement": "consulting",
	"Statement of Work (SOW)": "consulting",
	"Statement of Work": "consulting",
	"Master Agreement": "vendor",
	"Grant Agreement": "grant",
	"Government Contract": "government",
	"Memorandum of Understanding": "mou",
	"Donation/Gift Agreement": "donation",
	"Independent Contractor Agreement": "independent_contractor",
	"Fiscal Sponsorship Agreement": "fiscal_sponsorship",
	Amendment: "vendor",
	Other: "vendor",
};

interface Contract {
	$id: string;
	contractType?: string;
	selectedContractType?: string;
}

async function migrateContracts() {
	console.log("Starting contract type migration...\n");

	try {
		const { tablesDB } = await createAdminClient();

		// Fetch all contracts
		console.log("Fetching contracts from database...");
		const response = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			queries: [
				Query.limit(500), // Process in batches of 500
			],
		});

		const contracts = response.rows as unknown as Contract[];
		console.log(`Found ${contracts.length} contracts to process\n`);

		let updated = 0;
		let skipped = 0;
		let errors = 0;

		// Process each contract
		for (const contract of contracts) {
			try {
				// Skip if already has selectedContractType
				if (contract.selectedContractType) {
					console.log(
						`⏭️  Skipping contract ${contract.$id} - already has selectedContractType: ${contract.selectedContractType}`,
					);
					skipped++;
					continue;
				}

				// Map old type to new type
				const oldType = contract.contractType || "Other";
				const newType = CONTRACT_TYPE_MAPPING[oldType] || "vendor";

				console.log(`📝 Migrating contract ${contract.$id}:`);
				console.log(`   Old type: ${oldType}`);
				console.log(`   New type: ${newType}`);

				// Update contract with selectedContractType
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId,
					tableId: appwriteConfig.contractsCollectionId,
					rowId: contract.$id,
					data: {
						selectedContractType: newType,
					},
				});

				console.log(`✅ Successfully updated contract ${contract.$id}\n`);
				updated++;
			} catch (error) {
				console.error(`❌ Error updating contract ${contract.$id}:`, error);
				errors++;
			}
		}

		// Print summary
		console.log(`\n${"=".repeat(50)}`);
		console.log("Migration Summary:");
		console.log("=".repeat(50));
		console.log(`Total contracts: ${contracts.length}`);
		console.log(`✅ Updated: ${updated}`);
		console.log(`⏭️  Skipped: ${skipped}`);
		console.log(`❌ Errors: ${errors}`);
		console.log("=".repeat(50));

		if (errors > 0) {
			console.log(
				"\n⚠️  Some contracts failed to migrate. Please check the errors above.",
			);
			process.exit(1);
		} else {
			console.log("\n✨ Migration completed successfully!");
			process.exit(0);
		}
	} catch (error) {
		console.error("Fatal error during migration:", error);
		process.exit(1);
	}
}

// Run migration
if (require.main === module) {
	migrateContracts();
}

export { CONTRACT_TYPE_MAPPING, migrateContracts };

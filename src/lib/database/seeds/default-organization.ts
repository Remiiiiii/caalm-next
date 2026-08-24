/**
 * Default Organization Seed
 * Creates the default organization for existing data migration
 */

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getOrganization, type Organization } from "@/lib/rbac/organizations";

const DEFAULT_ORG_ID = "default_organization";
const DEFAULT_ORG_NAME = "Default Organization";

/**
 * Create or get default organization
 */
export async function getOrCreateDefaultOrganization(createdBy: string) {
	// Try to get existing default organization
	const existing = await getOrganization(DEFAULT_ORG_ID);

	if (existing) {
		console.log("Default organization already exists");
		return existing;
	}

	// Create default organization with the stable seed id used across the app.
	console.log("Creating default organization...");
	const { tablesDB } = await createAdminClient();

	const org = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "organizations",
		rowId: DEFAULT_ORG_ID,
		data: {
			name: DEFAULT_ORG_NAME,
			domain: "",
			subscriptionTier: "growth",
			status: "active",
			settings: JSON.stringify({
				maxUsers: 1000,
				maxDepartments: 100,
				features: ["all"],
			}),
			createdBy,
		},
	});

	console.log(`✓ Created default organization: ${org.$id}`);
	return {
		...org,
		settings:
			typeof org.settings === "string"
				? JSON.parse(org.settings)
				: org.settings,
	} as unknown as Organization;
}

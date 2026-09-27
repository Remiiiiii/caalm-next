import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { Organization } from "@/lib/rbac/organizations";

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function parseOrg(row: Record<string, unknown>): Organization {
	return {
		...row,
		settings:
			typeof row.settings === "string"
				? JSON.parse(row.settings)
				: (row.settings as Organization["settings"]),
	} as Organization;
}

/** Resolve a public give slug to an org (settings.giveSlug or normalized org name). */
export async function resolveOrganizationByGiveSlug(
	orgSlug: string,
): Promise<Organization | null> {
	const slug = slugify(orgSlug);
	if (!slug) return null;

	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "",
		tableId: "organizations",
		queries: [Query.limit(500)],
	});

	for (const row of result.rows as unknown as Record<string, unknown>[]) {
		const org = parseOrg(row);
		const settingsSlug =
			typeof org.settings?.giveSlug === "string"
				? slugify(org.settings.giveSlug)
				: "";
		if (settingsSlug === slug || slugify(org.name) === slug) {
			return org;
		}
	}
	return null;
}

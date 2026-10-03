import type { Organization } from "@/lib/rbac/organizations";

export function slugifyGiveSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Public URL slug: settings.giveSlug, else normalized org name. */
export function getOrganizationGiveSlug(org: {
	name: string;
	settings?: Organization["settings"] | null;
}): string {
	const settingsSlug =
		typeof org.settings?.giveSlug === "string"
			? slugifyGiveSlug(org.settings.giveSlug)
			: "";
	if (settingsSlug) return settingsSlug;
	return slugifyGiveSlug(org.name);
}

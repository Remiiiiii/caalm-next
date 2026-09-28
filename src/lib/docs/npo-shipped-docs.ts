import { existsSync } from "node:fs";
import { join } from "node:path";
import { NPO_CLAIMED_SHIPPED_ROUTES } from "@/lib/roadmap/nonprofit/npo-shipped-routes";

/**
 * Every shipped NPO app route we claim in nav must have a docs reference page.
 * Keeps /docs in sync with npo-shipped-routes.ts (roadmap 10.7).
 */
export const NPO_SHIPPED_ROUTE_DOC_SLUGS: Record<
	(typeof NPO_CLAIMED_SHIPPED_ROUTES)[number]["pathname"],
	string
> = {
	"/constituents": "reference/constituents",
	"/constituents/import": "reference/constituents",
	"/constituents/stewardship": "reference/constituents",
	"/dashboard/development": "reference/gifts-and-campaigns",
	"/gifts": "reference/gifts-and-campaigns",
	"/gifts/new": "reference/gifts-and-campaigns",
	"/campaigns": "reference/gifts-and-campaigns",
	"/volunteers/shifts": "reference/volunteers",
	"/settings/funds": "reference/nonprofit-finance-settings",
	"/settings/form-990": "reference/nonprofit-finance-settings",
};

export function findMissingNpoShippedDocFiles(cwd = process.cwd()): Array<{
	pathname: string;
	docSlug: string;
}> {
	const missing: Array<{ pathname: string; docSlug: string }> = [];
	for (const route of NPO_CLAIMED_SHIPPED_ROUTES) {
		const docSlug = NPO_SHIPPED_ROUTE_DOC_SLUGS[route.pathname];
		const filePath = join(cwd, "src/content/docs", `${docSlug}.md`);
		if (!existsSync(filePath)) {
			missing.push({ pathname: route.pathname, docSlug });
		}
	}
	return missing;
}

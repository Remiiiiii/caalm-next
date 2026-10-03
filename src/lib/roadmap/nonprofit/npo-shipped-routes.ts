import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * NPO features we claim as live in product nav / public copy (task 10.7).
 * Each entry must resolve to a real App Router page module.
 */
export const NPO_CLAIMED_SHIPPED_ROUTES = [
	{
		label: "Constituent list",
		pathname: "/constituents",
		pageModule: "src/app/(root)/constituents/page.tsx",
	},
	{
		label: "Constituent import",
		pathname: "/constituents/import",
		pageModule: "src/app/(root)/constituents/import/page.tsx",
	},
	{
		label: "Stewardship queue",
		pathname: "/constituents/stewardship",
		pageModule: "src/app/(root)/constituents/stewardship/page.tsx",
	},
	{
		label: "Development dashboard",
		pathname: "/dashboard/development",
		pageModule: "src/app/(root)/dashboard/development/page.tsx",
	},
	{
		label: "Gift register",
		pathname: "/gifts",
		pageModule: "src/app/(root)/gifts/page.tsx",
	},
	{
		label: "New gift",
		pathname: "/gifts/new",
		pageModule: "src/app/(root)/gifts/new/page.tsx",
	},
	{
		label: "Campaigns",
		pathname: "/campaigns",
		pageModule: "src/app/(root)/campaigns/page.tsx",
	},
	{
		label: "Volunteer shifts",
		pathname: "/volunteers/shifts",
		pageModule: "src/app/(root)/volunteers/shifts/page.tsx",
	},
	{
		label: "Restricted funds settings",
		pathname: "/settings/funds",
		pageModule: "src/app/(root)/settings/funds/page.tsx",
	},
	{
		label: "Form 990 mapping",
		pathname: "/settings/form-990",
		pageModule: "src/app/(root)/settings/form-990/page.tsx",
	},
	{
		label: "Donation page settings",
		pathname: "/settings/donation-page",
		pageModule: "src/app/(root)/settings/donation-page/page.tsx",
	},
] as const;

export type NpoShippedRouteViolation = {
	label: string;
	pathname: string;
	pageModule: string;
};

export function findMissingNpoShippedRouteModules(
	cwd = process.cwd(),
): NpoShippedRouteViolation[] {
	const missing: NpoShippedRouteViolation[] = [];
	for (const row of NPO_CLAIMED_SHIPPED_ROUTES) {
		if (!existsSync(join(cwd, row.pageModule))) {
			missing.push(row);
		}
	}
	return missing;
}

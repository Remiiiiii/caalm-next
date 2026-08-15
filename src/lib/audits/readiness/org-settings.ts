import type { Organization } from "@/lib/rbac/organizations";
import {
	DEFAULT_ORG_TIMEZONE,
	type OrgAuditSettings,
} from "./types";
import { resolveOrgTimezone } from "./timezone";

export function getOrgAuditSettings(org: Organization): OrgAuditSettings {
	const settings = org.settings || { maxUsers: 10, maxDepartments: 3, features: [] };
	const timezone = resolveOrgTimezone(
		typeof settings.timezone === "string" ? settings.timezone : null,
	);
	const websiteRaw = settings.websiteUrl;
	const websiteUrl =
		typeof websiteRaw === "string" && websiteRaw.trim()
			? websiteRaw.trim()
			: null;
	return { timezone, websiteUrl };
}

export function mergeOrgAuditSettings(
	existing: Organization["settings"],
	updates: { timezone?: string; websiteUrl?: string | null },
): Organization["settings"] {
	return {
		...existing,
		maxUsers: existing?.maxUsers ?? 10,
		maxDepartments: existing?.maxDepartments ?? 3,
		features: existing?.features ?? [],
		...(updates.timezone !== undefined
			? { timezone: resolveOrgTimezone(updates.timezone) }
			: {}),
		...(updates.websiteUrl !== undefined
			? { websiteUrl: updates.websiteUrl?.trim() || "" }
			: {}),
	};
}

export { DEFAULT_ORG_TIMEZONE };

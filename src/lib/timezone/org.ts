import { getOrganization } from "@/lib/rbac/organizations";
import { DEFAULT_ORG_TIMEZONE, resolveOrgTimezone } from "@/lib/timezone";

const cache = new Map<string, string>();

export async function getOrganizationTimezone(
	orgId?: string | null,
): Promise<string> {
	if (!orgId) return DEFAULT_ORG_TIMEZONE;
	const cached = cache.get(orgId);
	if (cached) return cached;
	const org = await getOrganization(orgId);
	const timezone = resolveOrgTimezone(
		typeof org?.settings?.timezone === "string" ? org.settings.timezone : null,
	);
	cache.set(orgId, timezone);
	return timezone;
}

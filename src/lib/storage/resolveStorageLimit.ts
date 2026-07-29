import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { TIER_LIMITS } from "@/lib/stripe/prices";

export async function resolveStorageLimitForUser(
	userId: string,
): Promise<{ limitBytes: number; limitGB: number; orgId: string | null }> {
	const defaultOrg = await getUserDefaultOrganization(userId);
	const orgId = defaultOrg?.orgId || null;

	if (!orgId) {
		const fallback = TIER_LIMITS.starter.storageBytes;
		return {
			limitBytes: fallback,
			limitGB: fallback / (1024 * 1024 * 1024),
			orgId: null,
		};
	}

	try {
		const org = await getOrganization(orgId);
		const rawTier = String(org?.subscriptionTier || "starter")
			.toLowerCase()
			.trim();
		const tier =
			rawTier in TIER_LIMITS
				? (rawTier as keyof typeof TIER_LIMITS)
				: "starter";
		const limitBytes = TIER_LIMITS[tier].storageBytes;
		return {
			limitBytes,
			limitGB: limitBytes / (1024 * 1024 * 1024),
			orgId,
		};
	} catch {
		const fallback = TIER_LIMITS.starter.storageBytes;
		return {
			limitBytes: fallback,
			limitGB: fallback / (1024 * 1024 * 1024),
			orgId,
		};
	}
}

/**
 * Resolve org + plan, then consume one AI extraction from the monthly quota.
 * Used by contract/license extract APIs.
 */

import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	assertAndConsumeAiExtraction,
	getAiExtractionUsage,
	resolveAiExtractionLimit,
} from "@/lib/billing/aiExtractionQuota";
import { resolveTier } from "@/lib/billing/planLimits";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function resolveOrgIdForBilling(
	request: NextRequest,
): Promise<string> {
	const fromRequest = getOrgIdFromRequest(request);
	if (fromRequest?.trim()) return fromRequest.trim();

	const user = await getCurrentUser();
	if (user?.$id) {
		const fromUser = (user as { orgId?: string }).orgId;
		if (fromUser?.trim()) return fromUser.trim();
		try {
			const defaultOrg = await getUserDefaultOrganization(user.$id);
			if (defaultOrg?.orgId) return defaultOrg.orgId;
		} catch {
			// fall through
		}
	}

	return "default_organization";
}

export async function consumeAiExtractionForRequest(request: NextRequest) {
	const orgId = await resolveOrgIdForBilling(request);
	const org = await getOrganization(orgId);
	const tier = resolveTier(org?.subscriptionTier);
	const billingStatus = org?.billingStatus || "none";

	return assertAndConsumeAiExtraction({
		orgId,
		tier,
		billingStatus,
	});
}

export async function getAiExtractionMeter(orgId: string, billingStatus?: string | null) {
	const org = await getOrganization(orgId);
	const tier = resolveTier(org?.subscriptionTier);
	const status = billingStatus ?? org?.billingStatus ?? "none";
	const used = await getAiExtractionUsage(orgId);
	const limit = resolveAiExtractionLimit({ tier, billingStatus: status });
	return { used, limit, tier };
}

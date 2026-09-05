import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import type { Organization } from "@/lib/rbac/organizations";
import { getOrganization } from "@/lib/rbac/organizations";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { assertCrmProviderAccess } from "./entitlements";
import type { CrmProvider } from "./types";

export async function resolveCrmOrgRequest(
	request: NextRequest,
	provider: CrmProvider,
): Promise<
	| { user: { $id: string }; org: Organization; orgId: string }
	| { response: NextResponse }
> {
	const user = await getCurrentUser();
	if (!user) {
		return {
			response: NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			),
		};
	}

	const orgId =
		getOrgIdFromRequest(request) ||
		(await getUserDefaultOrganization(user.$id))?.orgId;
	if (!orgId) {
		return {
			response: NextResponse.json(
				{ error: "orgId is required" },
				{ status: 400 },
			),
		};
	}

	const org = await getOrganization(orgId);
	if (!org) {
		return {
			response: NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			),
		};
	}

	try {
		assertCrmProviderAccess(org, provider);
	} catch (error) {
		return {
			response: NextResponse.json(
				{
					error:
						error instanceof Error
							? error.message
							: "Upgrade required for this CRM connector",
				},
				{ status: 403 },
			),
		};
	}

	return { user, org, orgId };
}

import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	hubspotConnector,
	validateHubSpotConfig,
} from "@/lib/crm/connectors/hubspot.connector";
import { assertCrmProviderAccess } from "@/lib/crm/entitlements";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
	});
	if (denied) return denied;

	try {
		validateHubSpotConfig();
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const orgId =
			getOrgIdFromRequest(request) ||
			(await getUserDefaultOrganization(user.$id))?.orgId;
		if (!orgId) {
			return NextResponse.json({ error: "orgId is required" }, { status: 400 });
		}

		const org = await getOrganization(orgId);
		if (!org) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}
		assertCrmProviderAccess(org, "hubspot");

		const state = `${user.$id}|${orgId}|${Date.now()}|${Math.random()
			.toString(36)
			.slice(2)}`;
		const cookieStore = await cookies();
		cookieStore.set("hubspot-oauth-state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
		});

		return NextResponse.redirect(hubspotConnector.getAuthUrl(state));
	} catch (error) {
		const message = error instanceof Error ? error.message : "HubSpot auth failed";
		const status = message.includes("available on the") ? 403 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

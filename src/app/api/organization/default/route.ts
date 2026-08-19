/**
 * Return the authenticated user's organization ID and timezone.
 * Optional ?orgId= checks membership before returning that org's timezone.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrganization } from "@/lib/rbac/organizations";
import {
	getUserDefaultOrganization,
	validateUserOrgAccess,
} from "@/lib/rbac/permissions";
import { DEFAULT_ORG_TIMEZONE, resolveOrgTimezone } from "@/lib/timezone";

export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const orgIdParam = request.nextUrl.searchParams.get("orgId");
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = orgIdParam || defaultOrg?.orgId;
		if (!orgId) {
			return NextResponse.json(
				{ orgId: null, timezone: DEFAULT_ORG_TIMEZONE },
				{ status: 200 },
			);
		}

		if (orgIdParam) {
			const allowed = await validateUserOrgAccess(user.$id, orgIdParam);
			if (!allowed) {
				return NextResponse.json({ error: "Forbidden" }, { status: 403 });
			}
		}

		const org = await getOrganization(orgId);
		const timezone = resolveOrgTimezone(
			typeof org?.settings?.timezone === "string"
				? org.settings.timezone
				: null,
		);

		return NextResponse.json({ orgId, timezone });
	} catch (error) {
		console.error("[organization/default] Error:", error);
		return NextResponse.json(
			{ error: "Failed to resolve organization" },
			{ status: 500 },
		);
	}
}

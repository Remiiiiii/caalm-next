/**
 * Return the authenticated user's default organization ID.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET() {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json({ orgId: null }, { status: 200 });
		}

		return NextResponse.json({ orgId: defaultOrg.orgId });
	} catch (error) {
		console.error("[organization/default] Error:", error);
		return NextResponse.json(
			{ error: "Failed to resolve organization" },
			{ status: 500 },
		);
	}
}

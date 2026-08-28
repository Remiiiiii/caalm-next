import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type OrgAuthResult =
	| { ok: false; response: NextResponse }
	| { ok: true; user: AppUser; orgId: string };

/** Org context after the route already called `requirePermission`. */
export async function resolveOrgContext(): Promise<OrgAuthResult> {
	const user = await getCurrentUser();
	if (!user) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			),
		};
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			),
		};
	}
	return { ok: true, user, orgId: org.orgId };
}

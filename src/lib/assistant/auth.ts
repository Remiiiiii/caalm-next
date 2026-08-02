import { NextResponse } from "next/server";
import type { PermissionKey } from "@/constants/permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";

export type AssistantAuthContext = {
	user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
	orgId: string;
	permissions: PermissionKey[];
};

export async function requireAssistantAccess(): Promise<
	AssistantAuthContext | NextResponse
> {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const permissions = await getUserPermissions(user.$id);
	if (!permissions.includes(PERMISSIONS.AI.CHAT)) {
		return NextResponse.json(
			{ error: "Permission denied. ai.chat is required." },
			{ status: 403 },
		);
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	return { user, orgId: defaultOrg.orgId, permissions };
}

export function isAssistantAuthError(
	result: AssistantAuthContext | NextResponse,
): result is NextResponse {
	return result instanceof NextResponse;
}

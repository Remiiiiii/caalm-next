/**
 * Resolve the tenant an IT hub request may inspect.
 *
 * Members use IT permissions in that org. Non-members need
 * platform.view_all_orgs plus the same IT permission in their home org.
 */

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	interpretITHubAccess,
	interpretITHubFleetAccess,
} from "@/lib/it/it-hub-access";
import { authorize } from "@/lib/rbac/authorize";
import { getOrgIdFromRequest } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	validateUserOrgAccess,
} from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type ITHubOrgContext =
	| { ok: false; response: NextResponse }
	| {
			ok: true;
			user: AppUser;
			orgId: string;
			homeOrgId: string;
			isPlatformCrossOrg: boolean;
	  };

export type ITHubFleetContext =
	| { ok: false; response: NextResponse }
	| { ok: true; user: AppUser; homeOrgId: string };

async function logCrossOrgHubRead(input: {
	user: AppUser;
	homeOrgId: string;
	targetOrgId: string;
	request: NextRequest;
}): Promise<void> {
	const actorName = input.user.fullName || input.user.name || "Unknown";
	await logAuditEvent({
		event_id: randomUUID(),
		event_title: "IT hub tenant inspected",
		action: "update",
		source: "caalm",
		user_id: input.user.$id,
		user_name: actorName,
		user_email: input.user.email || "",
		orgId: input.homeOrgId,
		status: "success",
		module: "it",
		target_type: "organization",
		target_id: input.targetOrgId,
		target_label: input.targetOrgId,
		summary: `${actorName} viewed IT hub data for tenant ${input.targetOrgId}`,
		metadata: {
			hubAccess: true,
			targetOrgId: input.targetOrgId,
			path: input.request.nextUrl.pathname,
		},
	});
}

export async function requireITHubOrgContext(
	request: NextRequest,
	permission: PermissionKey,
): Promise<ITHubOrgContext> {
	const user = await getCurrentUser();
	const defaultOrg = user
		? await getUserDefaultOrganization(user.$id)
		: undefined;
	const requestedOrgId = getOrgIdFromRequest(request);
	const targetOrgId = requestedOrgId || defaultOrg?.orgId;
	const isMember =
		!!user && !!targetOrgId
			? await validateUserOrgAccess(user.$id, targetOrgId)
			: false;

	let memberAllowed = false;
	if (user && targetOrgId && isMember) {
		const decision = await authorize({
			userId: user.$id,
			orgId: targetOrgId,
			permission,
		});
		memberAllowed = decision.allowed;
	}

	let platformAllowed = false;
	if (user && defaultOrg?.orgId && !isMember) {
		const decision = await authorize({
			userId: user.$id,
			orgId: defaultOrg.orgId,
			permission: [PERMISSIONS.PLATFORM.VIEW_ALL_ORGS, permission],
			requireAll: true,
		});
		platformAllowed = decision.allowed;
	}

	const access = interpretITHubAccess({
		authenticated: Boolean(user),
		targetOrgId,
		isMember,
		memberAllowed,
		platformAllowed,
	});

	if (!access.ok) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: access.error },
				{ status: access.status },
			),
		};
	}

	if (!user || !targetOrgId || !defaultOrg?.orgId) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Organization context required" },
				{ status: 400 },
			),
		};
	}

	if (access.isPlatformCrossOrg) {
		await logCrossOrgHubRead({
			user,
			homeOrgId: defaultOrg.orgId,
			targetOrgId,
			request,
		});
	}

	return {
		ok: true,
		user,
		orgId: targetOrgId,
		homeOrgId: defaultOrg.orgId,
		isPlatformCrossOrg: access.isPlatformCrossOrg,
	};
}

export async function requireITHubFleetContext(
	request: NextRequest,
): Promise<ITHubFleetContext> {
	const user = await getCurrentUser();
	const defaultOrg = user
		? await getUserDefaultOrganization(user.$id)
		: undefined;

	let platformAllowed = false;
	if (user && defaultOrg?.orgId) {
		const decision = await authorize({
			userId: user.$id,
			orgId: defaultOrg.orgId,
			permission: [
				PERMISSIONS.PLATFORM.VIEW_ALL_ORGS,
				PERMISSIONS.IT.VIEW_MONITORING,
			],
			requireAll: true,
		});
		platformAllowed = decision.allowed;
	}

	const access = interpretITHubFleetAccess({
		authenticated: Boolean(user),
		platformAllowed,
	});

	if (!access.ok) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: access.error },
				{ status: access.status },
			),
		};
	}

	if (!user || !defaultOrg?.orgId) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "Organization context required" },
				{ status: 400 },
			),
		};
	}

	void request;
	return { ok: true, user, homeOrgId: defaultOrg.orgId };
}

/** Page guard for /dashboard/it/tenants and tenant detail. */
export async function requireITHubPageOrg(
	userId: string,
	orgId: string,
): Promise<void> {
	const isMember = await validateUserOrgAccess(userId, orgId);
	if (isMember) {
		const decision = await authorize({
			userId,
			orgId,
			permission: PERMISSIONS.IT.VIEW_MONITORING,
		});
		if (!decision.allowed) redirect("/dashboard/it");
		return;
	}

	const home = await getUserDefaultOrganization(userId);
	const decision = await authorize({
		userId,
		orgId: home?.orgId,
		permission: [
			PERMISSIONS.PLATFORM.VIEW_ALL_ORGS,
			PERMISSIONS.IT.VIEW_MONITORING,
		],
		requireAll: true,
	});
	if (!decision.allowed) redirect("/dashboard/it");
}

export async function requireITHubFleetPage(userId: string): Promise<void> {
	const home = await getUserDefaultOrganization(userId);
	const decision = await authorize({
		userId,
		orgId: home?.orgId,
		permission: [
			PERMISSIONS.PLATFORM.VIEW_ALL_ORGS,
			PERMISSIONS.IT.VIEW_MONITORING,
		],
		requireAll: true,
	});
	if (!decision.allowed) redirect("/dashboard/it");
}

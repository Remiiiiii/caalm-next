import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getEffectiveUser } from "@/lib/impersonation/effective-user";
import {
	getUserDefaultOrganization,
	getUserPermissions,
	getUserRoles,
} from "@/lib/rbac/permissions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { parseStringify } from "@/lib/utils";

export async function GET(request: NextRequest) {
	try {
		const actor = await getCurrentUser();
		if (!actor) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		const context = await getEffectiveUser(request);
		if (!context) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(request.url);
		const orgId =
			searchParams.get("orgId") || context.impersonation?.orgId || undefined;
		const effectiveUserId = context.effectiveUser.$id;
		const impersonating = Boolean(context.impersonation);

		const cacheKey = CACHE_KEYS.rbac.check(effectiveUserId, orgId);

		const payload = await CacheManager.withCache(
			"rbac/check",
			cacheKey,
			async () => {
				const permissions = await getUserPermissions(effectiveUserId, orgId);

				let roleOrgId = orgId;
				if (!roleOrgId) {
					const defaultOrg = await getUserDefaultOrganization(effectiveUserId);
					roleOrgId = defaultOrg?.orgId;
				}
				const roles = roleOrgId
					? await getUserRoles(effectiveUserId, roleOrgId)
					: [];

				return {
					permissions: parseStringify(permissions),
					roles: parseStringify(
						roles.map((role) => ({
							roleId: role.roleId,
							roleName: role.roleName || null,
						})),
					),
				};
			},
		);

		return NextResponse.json({
			success: true,
			permissions: payload.permissions,
			roles: payload.roles,
			effectiveUserId,
			actorUserId: context.actor.$id,
			impersonating,
			effectiveUser: {
				$id: context.effectiveUser.$id,
				fullName: context.effectiveUser.fullName || "",
				email: context.effectiveUser.email || "",
				department: context.effectiveUser.department || "",
				departmentLabel: context.effectiveUser.departmentLabel || "",
			},
		});
	} catch (error) {
		console.error("Error fetching user permissions:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch permissions" },
			{ status: 500 },
		);
	}
}

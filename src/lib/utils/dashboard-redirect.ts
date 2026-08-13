/**
 * Client-side dashboard URL resolution (uses server policy endpoint).
 */

import { ROLE_DASHBOARD_FALLBACK } from "@/lib/rbac/role-dashboard-metadata";
import { getHighestPriorityRole } from "@/lib/utils/role-priority";

/** Fallback when dashboard-home API is unavailable */
const ROLE_NAME_TO_PATH: Record<string, string> = {
	"Super Admin": "/dashboard/superadmin",
	"Organization Admin": "/dashboard/organizationadmin",
	"Department Manager": "/dashboard/departmentmanager",
	Viewer: "/dashboard/viewer",
	IT: "/dashboard/it",
	"Content Creator": "/dashboard/content-creator",
};

const dashboardUrlCache = new Map<string, { url: string; timestamp: number }>();

export function invalidateDashboardUrlCache(userId?: string): void {
	if (!userId) {
		dashboardUrlCache.clear();
		return;
	}

	for (const key of dashboardUrlCache.keys()) {
		if (key.startsWith(`${userId}:`)) {
			dashboardUrlCache.delete(key);
		}
	}
}

/**
 * Get dashboard URL for a user (server policy via API).
 */
export async function getDashboardUrlForUser(
	userId: string,
	orgId: string = "default_organization",
): Promise<string> {
	try {
		const cacheKey = `${userId}:${orgId}`;
		const cached = dashboardUrlCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < 300000) {
			return cached.url;
		}

		const homeRes = await fetch(
			`/api/users/${userId}/dashboard-home?orgId=${encodeURIComponent(orgId)}`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json" },
				cache: "force-cache",
			},
		);

		if (homeRes.ok) {
			const homeData = await homeRes.json();
			const path = homeData?.data?.path;
			if (
				typeof path === "string" &&
				path.startsWith("/dashboard") &&
				path !== "/dashboard"
			) {
				dashboardUrlCache.set(cacheKey, {
					url: path,
					timestamp: Date.now(),
				});
				return path;
			}
		}

		const response = await fetch(
			`/api/users/${userId}/roles${orgId ? `?orgId=${orgId}` : ""}`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json" },
				cache: "force-cache",
			},
		);

		if (!response.ok) {
			return "/dashboard";
		}

		const data = await response.json();
		let dashboardUrl = "/dashboard";
		if (data.success && data.data?.roles && data.data.roles.length > 0) {
			const roles = data.data.roles.map((r: any) => ({
				roleName: r.name,
				priority:
					typeof r.priority === "number"
						? r.priority
						: ROLE_DASHBOARD_FALLBACK[r.$id]?.priority,
			}));
			const selectedRole = getHighestPriorityRole(roles);
			if (selectedRole) {
				const roleObj = data.data.roles.find(
					(r: any) => r.name === selectedRole,
				);
				const byId = roleObj?.$id
					? ROLE_DASHBOARD_FALLBACK[roleObj.$id]?.homeDashboardPath
					: undefined;
				dashboardUrl = byId || ROLE_NAME_TO_PATH[selectedRole] || "/dashboard";
			}
		}

		dashboardUrlCache.set(cacheKey, {
			url: dashboardUrl,
			timestamp: Date.now(),
		});

		return dashboardUrl;
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error fetching dashboard URL for user:", error);
		}
		return "/dashboard";
	}
}

/**
 * Map role display name → home path when API is unavailable (best-effort).
 */
export function getDashboardUrlFromRoleName(
	roleName: string | null | undefined,
): string {
	if (!roleName) {
		return "/dashboard";
	}
	return ROLE_NAME_TO_PATH[roleName] || "/dashboard";
}

/**
 * Dashboard route guards — delegates to centralized access policy.
 */

"use server";

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	resolveDashboardHomePath,
	userMayAccessDashboardPath,
} from "@/lib/rbac/dashboard-access-policy";
import {
	getUserDefaultOrganization,
	getUserRoles,
} from "@/lib/rbac/permissions";

/**
 * Server-only: resolve where `/dashboard` should send the current user.
 * Returns `null` if unauthenticated, missing org, or no accessible dashboard.
 */
export async function getDashboardHomeRedirectPath(): Promise<string | null> {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return null;
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return null;
		}

		return resolveDashboardHomePath(user.$id, defaultOrg.orgId);
	} catch (error) {
		console.error("[getDashboardHomeRedirectPath] Error:", error);
		return null;
	}
}

/**
 * Check if user has access to a specific dashboard route.
 * Returns redirect response if unauthorized, null if allowed.
 */
export async function redirectIfNotAuthorizedForDashboard(
	request: NextRequest,
): Promise<NextResponse | null> {
	try {
		const { pathname } = request.nextUrl;

		if (!pathname.startsWith("/dashboard")) {
			return null;
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.redirect(new URL("/sign-in", request.url));
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.redirect(new URL("/sign-in", request.url));
		}

		const orgId = defaultOrg.orgId;

		if (await userMayAccessDashboardPath(user.$id, orgId, pathname)) {
			return null;
		}

		const userRoles = await getUserRoles(user.$id, orgId);
		const redirectUrl =
			(await resolveDashboardHomePath(user.$id, orgId)) ?? "/dashboard";

		console.warn(
			`[Dashboard Guard] Unauthorized access attempt by user ${user.$id} (roles: ${userRoles.map((r) => r.roleName).join(", ")}) to ${pathname}. Redirecting to ${redirectUrl}`,
		);

		return NextResponse.redirect(new URL(redirectUrl, request.url));
	} catch (error) {
		console.error("[redirectIfNotAuthorizedForDashboard] Error:", error);
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}
}

/**
 * Check if a user has a specific role name (legacy helper).
 */
export async function hasRole(
	userId: string,
	roleName: string,
): Promise<boolean> {
	try {
		const defaultOrg = await getUserDefaultOrganization(userId);
		if (!defaultOrg) {
			return false;
		}

		const userRoles = await getUserRoles(userId, defaultOrg.orgId);
		return userRoles.some((role) => role.roleName === roleName);
	} catch (error) {
		console.error(
			`[hasRole] Error checking role ${roleName} for user ${userId}:`,
			error,
		);
		return false;
	}
}

/**
 * IT Route Guards
 * Middleware functions for IT route protection and permission checks
 */

"use server";

import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { isITDepartment } from "@/lib/rbac/it-department";
import { getUserDepartmentProfile } from "@/lib/rbac/dashboard-access-policy";
import {
	getUserDefaultOrganization,
	getUserRoles,
	hasAnyPermission,
} from "@/lib/rbac/permissions";

const IT_PERMISSIONS = Object.values(PERMISSIONS.IT) as PermissionKey[];

/**
 * Check if user is in the IT department and holds any IT permission.
 */
export async function hasITRole(userId: string): Promise<boolean> {
	try {
		const profile = await getUserDepartmentProfile(userId);
		if (!isITDepartment(profile)) {
			return false;
		}

		const defaultOrg = await getUserDefaultOrganization(userId);
		if (!defaultOrg) {
			return false;
		}

		return await hasAnyPermission(userId, IT_PERMISSIONS, defaultOrg.orgId);
	} catch (error) {
		console.error("[hasITRole] Error:", error);
		return false;
	}
}

/**
 * Require any IT permission - returns error response if user has none
 */
export async function requireITRole(
	request: NextRequest,
): Promise<NextResponse | null> {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const hasRole = await hasITRole(user.$id);
		if (!hasRole) {
			// Log unauthorized access attempt
			console.warn(
				`[IT Route Guard] Unauthorized access attempt by user ${user.$id} to ${request.nextUrl.pathname}`,
			);

			return NextResponse.json(
				{ error: "Access denied. IT permission required." },
				{ status: 403 },
			);
		}

		return null;
	} catch (error) {
		console.error("[requireITRole] Error:", error);
		return NextResponse.json(
			{ error: "Failed to verify IT permission" },
			{ status: 500 },
		);
	}
}

/**
 * Require specific IT permission
 */
export async function requireITPermission(
	request: NextRequest,
	permission: PermissionKey,
): Promise<NextResponse | null> {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		if (
			!isITDepartment({
				department: (user as { department?: string }).department,
				departmentLabel: (user as { departmentLabel?: string }).departmentLabel,
			})
		) {
			return NextResponse.json(
				{ error: "Access denied. IT department required." },
				{ status: 403 },
			);
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json(
				{ error: "Organization access required" },
				{ status: 403 },
			);
		}

		const allowed = await hasAnyPermission(
			user.$id,
			[permission],
			defaultOrg.orgId,
		);

		if (!allowed) {
			// Log unauthorized access attempt
			console.warn(
				`[IT Route Guard] Unauthorized permission access attempt by user ${user.$id} to ${request.nextUrl.pathname} - required: ${permission}`,
			);

			return NextResponse.json(
				{ error: `Access denied. Permission required: ${permission}` },
				{ status: 403 },
			);
		}

		return null;
	} catch (error) {
		console.error("[requireITPermission] Error:", error);
		return NextResponse.json(
			{ error: "Failed to verify permission" },
			{ status: 500 },
		);
	}
}

/**
 * Redirect if user doesn't have any IT permission
 * Returns redirect response to user's default dashboard
 */
export async function redirectIfNotIT(
	request: NextRequest,
): Promise<NextResponse | null> {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.redirect(new URL("/sign-in", request.url));
		}

		const hasRole = await hasITRole(user.$id);
		if (!hasRole) {
			// Get user's default dashboard based on highest priority role
			const defaultOrg = await getUserDefaultOrganization(user.$id);
			if (defaultOrg) {
				const userRoles = await getUserRoles(user.$id, defaultOrg.orgId);

				// Import role priority helper
				const { getHighestPriorityRole } = await import(
					"@/lib/utils/role-priority"
				);
				const roleName = getHighestPriorityRole(userRoles);

				// Redirect to appropriate dashboard based on role
				let redirectUrl = "/dashboard";
				if (roleName === "Super Admin") {
					redirectUrl = "/dashboard/superadmin";
				} else if (roleName === "Organization Admin") {
					redirectUrl = "/dashboard/organizationadmin";
				} else if (roleName === "Department Manager") {
					redirectUrl = "/dashboard/departmentmanager";
				} else if (roleName === "Viewer") {
					redirectUrl = "/dashboard/viewer";
				} else if (roleName === "IT") {
					redirectUrl = "/dashboard/it";
				}

				// Log unauthorized access attempt
				console.warn(
					`[IT Route Guard] Redirecting user ${user.$id} from ${request.nextUrl.pathname} to ${redirectUrl}`,
				);

				return NextResponse.redirect(new URL(redirectUrl, request.url));
			}

			return NextResponse.redirect(new URL("/dashboard", request.url));
		}

		return null;
	} catch (error) {
		console.error("[redirectIfNotIT] Error:", error);
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}
}

/**
 * Navigation Permission Mappings
 * Maps navigation items to required permissions (permission keys only — no role-name denylists).
 */

import { permissionSatisfied } from "@/lib/rbac/permission-implications";
import type { PermissionKey } from "./permissions";
import { PERMISSIONS } from "./permissions";

export interface NavigationItem {
	name: string;
	icon: string;
	url: string;
	permissions: PermissionKey[]; // Array of permissions (user needs ANY of these)
	requireAll?: boolean; // If true, user needs ALL permissions
	requiresElevated?: boolean; // If true, shows lock icon when permission is missing
	viewerReadOnly?: boolean; // If true, Viewer role sees this as read-only
	viewerFullAccess?: boolean; // If true, Viewer gets full read access (for audits)
}

export interface NavigationSection {
	header: string;
	items: NavigationItem[];
}

/**
 * Navigation configuration with permission-based access control.
 * Visibility is driven only by catalog keys (plus implications).
 *
 * Default-role smoke expectations (from seed packs):
 * - Viewer: calendar, own contracts/licenses, audits, docs (read), my access
 * - Dept Manager: department-scoped contracts/licenses, approvals, team view — not org-wide "All" lists
 * - Org Admin: org settings/billing; not System Settings (platform.system_settings)
 * - Super Admin: System Settings via platform.system_settings
 */
export const PERMISSION_BASED_NAV: NavigationSection[] = [
	{
		header: "Dashboard",
		items: [
			// Dashboard items are dynamically generated based on user roles
			// See Sidebar.tsx for role-based dashboard generation
		],
	},
	{
		header: "Calendar",
		items: [
			{
				name: "Calendar View",
				icon: "/assets/icons/calendar.svg",
				url: "/calendar",
				permissions: [
					PERMISSIONS.CALENDAR.VIEW_OWN,
					PERMISSIONS.CALENDAR.VIEW_TEAM,
					PERMISSIONS.CALENDAR.VIEW_ALL,
				],
				viewerReadOnly: true,
			},
		],
	},
	{
		header: "Contracts",
		items: [
			{
				name: "All Contracts",
				icon: "/assets/icons/documents.svg",
				url: "/contracts",
				// Org-wide list: VIEW_ALL only (Dept Manager has VIEW_DEPARTMENT, not VIEW_ALL)
				permissions: [PERMISSIONS.CONTRACTS.VIEW_ALL],
				viewerReadOnly: true,
			},
			{
				name: "My Contracts",
				icon: "/assets/icons/my-contracts.svg",
				url: "/my-contracts",
				permissions: [
					PERMISSIONS.CONTRACTS.VIEW,
					PERMISSIONS.CONTRACTS.VIEW_OWN,
					PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
					PERMISSIONS.CONTRACTS.VIEW_ALL,
				],
				viewerReadOnly: true,
			},
			{
				name: "Proposals & Approvals",
				icon: "/assets/icons/edit.svg",
				url: "/contracts/approvals",
				permissions: [
					PERMISSIONS.CONTRACTS.APPROVE,
					PERMISSIONS.CONTRACTS.REVIEW,
				],
				requiresElevated: true,
				viewerReadOnly: true,
			},
			{
				name: "Advanced Resources",
				icon: "/assets/icons/search.svg",
				url: "/contracts/advanced-resources",
				// Create/edit — not on Viewer or Dept Manager packs
				permissions: [PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.CONTRACTS.EDIT],
			},
			{
				name: "Funding & Retention",
				icon: "/assets/icons/dollar-circle.svg",
				url: "/contracts/funding-retention",
				permissions: [PERMISSIONS.FUNDING.VIEW],
				viewerReadOnly: true,
			},
		],
	},
	{
		header: "Licenses",
		items: [
			{
				name: "All Licenses",
				icon: "/assets/icons/license.svg",
				url: "/licenses",
				// Org-wide list: VIEW_ALL only
				permissions: [PERMISSIONS.LICENSES.VIEW_ALL],
				viewerReadOnly: true,
			},
			{
				name: "Department Licenses",
				icon: "/assets/icons/department.svg",
				url: "/licenses/department",
				permissions: [
					PERMISSIONS.LICENSES.VIEW,
					PERMISSIONS.LICENSES.VIEW_DEPARTMENT,
					PERMISSIONS.LICENSES.VIEW_ALL,
				],
				viewerReadOnly: true,
			},
			{
				name: "Proposals & Approvals",
				icon: "/assets/icons/edit.svg",
				url: "/licenses/approvals",
				permissions: [
					PERMISSIONS.LICENSES.EDIT,
					PERMISSIONS.LICENSES.RENEW,
					PERMISSIONS.LICENSES.APPROVE,
				],
				requiresElevated: true,
				viewerReadOnly: true,
			},
		],
	},
	{
		header: "Audits",
		items: [
			{
				name: "Audit Readiness",
				icon: "/assets/icons/compliance-status.svg",
				url: "/audits/readiness",
				permissions: [PERMISSIONS.AUDIT.VIEW],
				hiddenForRoles: ["Department Manager"],
				viewerReadOnly: true,
				viewerFullAccess: true,
			},
			{
				name: "Compliance Status",
				icon: "/assets/icons/compliance-status.svg",
				url: "/audits/status",
				permissions: [PERMISSIONS.AUDIT.VIEW],
				viewerReadOnly: true,
				viewerFullAccess: true,
			},
			{
				name: "Audit Logs",
				icon: "/assets/icons/audit-logs.svg",
				url: "/audits/audit",
				permissions: [PERMISSIONS.AUDIT.VIEW],
				viewerReadOnly: true,
				viewerFullAccess: true,
			},
		],
	},
	{
		header: "Files",
		items: [
			{
				name: "Uploads",
				icon: "/assets/icons/uploads.svg",
				url: "/uploads",
				// Create — Viewer pack has VIEW only
				permissions: [PERMISSIONS.CONTRACTS.CREATE],
			},
			{
				name: "Documents",
				icon: "/assets/icons/documents.svg",
				url: "/documents",
				permissions: [PERMISSIONS.CONTRACTS.VIEW],
				viewerReadOnly: true,
			},
			{
				name: "Images",
				icon: "/assets/icons/images.svg",
				url: "/images",
				permissions: [PERMISSIONS.CONTRACTS.VIEW],
				viewerReadOnly: true,
			},
			{
				name: "Media",
				icon: "/assets/icons/media.svg",
				url: "/media",
				permissions: [PERMISSIONS.CONTRACTS.VIEW],
				viewerReadOnly: true,
			},
			{
				name: "Others",
				icon: "/assets/icons/others.svg",
				url: "/others",
				permissions: [PERMISSIONS.CONTRACTS.VIEW],
				viewerReadOnly: true,
			},
		],
	},
	{
		header: "Team",
		items: [
			{
				name: "User Management",
				icon: "/assets/icons/user-management.svg",
				url: "/dashboard/user-management",
				permissions: [PERMISSIONS.USERS.VIEW],
				viewerReadOnly: true,
			},
			{
				name: "Role Management",
				icon: "/assets/icons/users.svg",
				url: "/dashboard/admin/roles",
				permissions: [PERMISSIONS.USERS.ASSIGN_ROLES],
				requiresElevated: true,
			},
			{
				name: "Assign Tasks",
				icon: "/assets/icons/task.svg",
				url: "/team/tasks",
				permissions: [PERMISSIONS.EVENTS.CREATE, PERMISSIONS.EVENTS.INVITE],
			},
		],
	},
	{
		header: "Reports & Analytics",
		items: [
			{
				name: "Overview",
				icon: "/assets/icons/department.svg",
				url: "/analytics",
				permissions: [
					PERMISSIONS.CONTRACTS.VIEW,
					PERMISSIONS.CALENDAR.VIEW_ALL,
					PERMISSIONS.CALENDAR.VIEW_TEAM,
				],
				viewerReadOnly: true,
			},
			{
				name: "Quick View",
				icon: "/assets/icons/analytics.svg",
				url: "/analytics/quick-view",
				permissions: [
					PERMISSIONS.CONTRACTS.VIEW,
					PERMISSIONS.CALENDAR.VIEW_ALL,
					PERMISSIONS.CALENDAR.VIEW_TEAM,
				],
				viewerReadOnly: true,
			},
			{
				name: "C Suite",
				icon: "/assets/icons/department.svg",
				url: "/analytics/c-suite",
				permissions: [PERMISSIONS.CALENDAR.VIEW_ALL, PERMISSIONS.SETTINGS.VIEW],
				requiresElevated: true,
				viewerReadOnly: true,
			},
		],
	},
	{
		header: "My Roles & Permissions",
		items: [
			{
				name: "View My Access",
				icon: "/assets/icons/users.svg",
				url: "/settings/permissions",
				permissions: [], // Everyone can view their own permissions
			},
		],
	},
	{
		header: "Settings",
		items: [
			{
				name: "System Settings",
				icon: "/assets/icons/settings.svg",
				url: "/settings/system",
				// Platform break-glass only (Super Admin); Org Admin pack excludes PLATFORM keys
				permissions: [PERMISSIONS.PLATFORM.SYSTEM_SETTINGS],
				requiresElevated: true,
			},
			{
				name: "Organization Settings",
				icon: "/assets/icons/settings.svg",
				url: "/settings/organization",
				permissions: [PERMISSIONS.SETTINGS.VIEW, PERMISSIONS.SETTINGS.EDIT],
				viewerReadOnly: true,
			},
			{
				name: "Billing & Integrations",
				icon: "/assets/icons/settings.svg",
				url: "/settings/billing",
				permissions: [
					PERMISSIONS.SETTINGS.BILLING,
					PERMISSIONS.SETTINGS.INTEGRATIONS,
				],
				requiresElevated: true,
			},
		],
	},
];

/**
 * Helper function to check if user has permission for navigation item.
 * Uses permission implications (e.g. VIEW_ALL satisfies VIEW_OWN).
 */
export function hasNavigationPermission(
	userPermissions: PermissionKey[],
	item: NavigationItem,
): boolean {
	if (item.permissions.length === 0) return true; // No permission required

	if (item.requireAll) {
		return item.permissions.every((perm) =>
			permissionSatisfied(userPermissions, perm),
		);
	}

	return item.permissions.some((perm) =>
		permissionSatisfied(userPermissions, perm),
	);
}

/**
 * Default System Roles
 * Seed data for default system roles with permission assignments
 */

import {
	getOrganizationAdminPermissionKeys,
	PERMISSIONS,
} from "@/constants/permissions";
import { assignPermissionsToRole, createRole } from "@/lib/rbac/roles";

export interface DefaultRoleDefinition {
	name: string;
	description: string;
	isSystemRole: boolean;
	permissions: string[];
}

export const DEFAULT_ROLES: DefaultRoleDefinition[] = [
	{
		name: "Super Admin",
		description:
			"Full platform access including break-glass diagnostics and schema tools",
		isSystemRole: true,
		permissions: Object.values(PERMISSIONS).flatMap((category) =>
			Object.values(category),
		),
	},
	{
		name: "Organization Admin",
		description:
			"Full access within an organization (no platform break-glass tools)",
		isSystemRole: true,
		permissions: getOrganizationAdminPermissionKeys(),
	},
	{
		name: "Department Manager",
		description: "Manage department operations, approve events and contracts",
		isSystemRole: true,
		permissions: [
			PERMISSIONS.CALENDAR.VIEW_TEAM,
			PERMISSIONS.CALENDAR.EDIT_ALL,
			PERMISSIONS.EVENTS.APPROVE,
			PERMISSIONS.EVENTS.RESCHEDULE,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
			PERMISSIONS.CONTRACTS.REVIEW,
			PERMISSIONS.CONTRACTS.APPROVE,
			PERMISSIONS.LICENSES.VIEW,
			PERMISSIONS.LICENSES.VIEW_DEPARTMENT,
			PERMISSIONS.USERS.VIEW,
			PERMISSIONS.USERS.INVITE,
		],
	},
	{
		name: "Viewer",
		description: "Read-only access across core modules",
		isSystemRole: true,
		permissions: [
			PERMISSIONS.CALENDAR.VIEW_OWN,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.VIEW_OWN,
			PERMISSIONS.LICENSES.VIEW,
			PERMISSIONS.LICENSES.VIEW_OWN,
			PERMISSIONS.NEWS.READ,
			PERMISSIONS.AUDIT.VIEW,
			PERMISSIONS.AI.CHAT,
			PERMISSIONS.TICKETS.VIEW,
		],
	},
	{
		name: "Content Creator",
		description: "Create and publish internal news; no billing or user admin",
		isSystemRole: true,
		permissions: [
			PERMISSIONS.NEWS.READ,
			PERMISSIONS.NEWS.CREATE,
			PERMISSIONS.NEWS.UPDATE,
			PERMISSIONS.NEWS.PUBLISH,
			PERMISSIONS.NEWS.DELETE,
			PERMISSIONS.AI.CHAT,
			PERMISSIONS.AI.IMAGE_GENERATE,
			PERMISSIONS.CALENDAR.VIEW_OWN,
			PERMISSIONS.TICKETS.VIEW,
			PERMISSIONS.TICKETS.CREATE,
		],
	},
	{
		name: "IT",
		description:
			"IT/Software Engineering staff with access to monitoring, CI/CD, security, and system administration",
		isSystemRole: true,
		permissions: [
			...Object.values(PERMISSIONS.IT),
			PERMISSIONS.AUDIT.VIEW,
			PERMISSIONS.AUDIT.EXPORT,
			PERMISSIONS.CALENDAR.VIEW_OWN,
			PERMISSIONS.TICKETS.VIEW,
			PERMISSIONS.TICKETS.CREATE,
			PERMISSIONS.TICKETS.EDIT,
			PERMISSIONS.TICKETS.ASSIGN,
			PERMISSIONS.TICKETS.RESOLVE,
		],
	},
];

/**
 * Seed default system roles
 */
export async function seedDefaultRoles(createdBy: string): Promise<void> {
	console.log("Seeding default system roles...");

	for (const roleDef of DEFAULT_ROLES) {
		try {
			const { listRoles } = await import("@/lib/rbac/roles");
			const existingRoles = await listRoles(null);
			const existing = existingRoles.find((r) => r.name === roleDef.name);

			let roleId: string;
			if (existing) {
				console.log(`Role "${roleDef.name}" already exists, skipping creation`);
				roleId = existing.$id;
			} else {
				const role = await createRole({
					name: roleDef.name,
					description: roleDef.description,
					orgId: null,
					isSystemRole: roleDef.isSystemRole,
					createdBy,
				});
				roleId = role.$id;
				console.log(`Created role: ${roleDef.name}`);
			}

			await assignPermissionsToRole(roleId, roleDef.permissions as any);
			console.log(
				`Assigned ${roleDef.permissions.length} permissions to ${roleDef.name}`,
			);
		} catch (error) {
			console.error(`Error seeding role "${roleDef.name}":`, error);
			throw error;
		}
	}

	console.log("✓ Default roles seeded successfully");
}

/**
 * Roles Schema
 * Organization-scoped role definitions
 */

export interface Role {
	$id: string;
	name: string;
	description?: string;
	orgId?: string | null; // null = system role, string = org-specific role
	isSystemRole: boolean; // System roles cannot be deleted
	createdAt: string;
	updatedAt: string;
	createdBy: string;
}

export const ROLE_ATTRIBUTES = [
	{
		key: "name",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "description",
		type: "string" as const,
		size: 1000,
		required: false,
	},
	{
		key: "orgId",
		type: "string" as const,
		size: 255,
		required: false,
	},
	{
		key: "isSystemRole",
		type: "boolean" as const,
		required: true,
		default: false,
	},
	{
		key: "createdBy",
		type: "string" as const,
		size: 255,
		required: true,
	},
] as const;

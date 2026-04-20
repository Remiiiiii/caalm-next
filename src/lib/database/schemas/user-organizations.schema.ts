/**
 * User-Organizations Schema
 * Junction table for user-organization relationships (multi-tenant support)
 */

export interface UserOrganization {
	$id: string;
	userId: string;
	orgId: string;
	orgRole: "owner" | "admin" | "member"; // Organization-level role
	isDefault: boolean; // User's default organization
	joinedAt: string;
	invitedBy?: string;
}

export const USER_ORGANIZATIONS_ATTRIBUTES = [
	{
		key: "userId",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "orgId",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "orgRole",
		type: "enum" as const,
		elements: ["owner", "admin", "member"],
		required: true,
	},
	{
		key: "isDefault",
		type: "boolean" as const,
		required: true,
		default: false,
	},
	{
		key: "invitedBy",
		type: "string" as const,
		size: 255,
		required: false,
	},
] as const;

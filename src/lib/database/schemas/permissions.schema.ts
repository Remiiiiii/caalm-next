/**
 * Permissions Schema
 * Global permission definitions (shared across all organizations)
 */

export interface Permission {
	$id: string;
	key: string; // e.g., "calendar.view_own"
	name: string; // Display name
	category: string; // e.g., "calendar", "events", "contracts"
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export const PERMISSION_CATEGORIES = [
	"calendar",
	"events",
	"contracts",
	"integrations",
	"users",
	"settings",
	"ai",
	"audit",
	"news",
] as const;

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number];

export const PERMISSION_ATTRIBUTES = [
	{
		key: "key",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "name",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "category",
		type: "string" as const,
		size: 100,
		required: true,
	},
	{
		key: "description",
		type: "string" as const,
		size: 1000,
		required: false,
	},
] as const;

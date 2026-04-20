/**
 * Organizations Schema
 * Multi-tenant organization definitions
 */

export interface Organization {
	$id: string;
	name: string;
	domain?: string; // Email domain for auto-assignment
	subscriptionTier: "starter" | "growth" | "enterprise";
	status: "active" | "suspended" | "trial";
	settings: {
		maxUsers: number;
		maxDepartments: number;
		features: string[];
	};
	createdAt: string;
	updatedAt: string;
	createdBy: string;
}

export const ORGANIZATION_ATTRIBUTES = [
	{
		key: "name",
		type: "string" as const,
		size: 255,
		required: true,
	},
	{
		key: "domain",
		type: "string" as const,
		size: 255,
		required: false,
	},
	{
		key: "subscriptionTier",
		type: "enum" as const,
		elements: ["starter", "growth", "enterprise"],
		required: true,
	},
	{
		key: "status",
		type: "enum" as const,
		elements: ["active", "suspended", "trial"],
		required: true,
	},
	{
		key: "settings",
		type: "string" as const, // JSON stored as string
		size: 4096,
		required: true,
	},
	{
		key: "createdBy",
		type: "string" as const,
		size: 255,
		required: true,
	},
] as const;

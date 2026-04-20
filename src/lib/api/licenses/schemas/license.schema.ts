import { z } from "zod";

/**
 * Schema for license creation requests
 * Supports both database field names and legacy aliases
 */
export const licenseCreateSchema = z.object({
	// Required fields
	licenseName: z.string().min(1, "License name is required"),
	licenseNumber: z.string().optional(), // Optional in schema, but required in DB
	licenseType: z.string().optional(), // Optional in schema, but required in DB
	licenseExpiryDate: z.string().optional(), // Optional in schema, but required in DB
	issuingAuthority: z.string().optional(), // Optional in schema, but required in DB
	issueDate: z.string().optional(), // Optional in schema, but required in DB
	status: z
		.enum([
			"active",
			"inactive",
			"expired",
			"pending-review",
			"suspended",
			"action-required",
		])
		.optional()
		.default("active"),

	// Optional - Core fields
	description: z.string().optional(),
	renewalDate: z.string().optional(),
	daysUntilExpiry: z.union([z.string(), z.number()]).optional(),
	compliance: z
		.enum(["compliant", "non-compliant", "at-risk", "action-required"])
		.optional(),
	division: z
		.enum([
			"administration",
			"c-suite",
			"management",
			"childwelfare",
			"behavioralhealth",
			"clinic",
			"residential",
			"cins-fins-snap",
		])
		.optional(),
	assignedManagers: z.array(z.string()).optional(),
	licenseUrl: z.string().url().optional(),
	fileId: z.string().optional(),
	fileRef: z.string().optional(),

	// Optional - Software license fields
	vendor: z.string().optional(),
	product: z.string().optional(),
	category: z
		.enum(["saas", "on_premise", "cloud", "certificate", "insurance", "other"])
		.optional(),
	quantity: z.union([z.string(), z.number()]).optional(),
	availableQuantity: z.union([z.string(), z.number()]).optional(),
	cost: z.union([z.string(), z.number()]).optional(),
	currencyCode: z.string().optional().default("USD"),
	autoRenew: z.boolean().optional(),
	renewalNoticeDays: z.union([z.string(), z.number()]).optional(),

	// Optional - Organization/Assignment
	assignedDepartments: z.array(z.string()).optional(),
	licenseOwnerId: z.string().optional(),
	subDepartment: z.string().optional(),
	businessUnit: z.string().optional(),
	department: z.string().optional(), // Alias for division

	// Optional - Metadata
	tags: z.array(z.string()).optional(),
	notes: z.string().optional(),
	relatedContractId: z.string().optional(),
	attachmentReferences: z.array(z.string()).optional(),

	// Optional - License permissions
	allowsReproduction: z.boolean().optional(),
	allowsDistribution: z.boolean().optional(),
	allowsCommercialUse: z.boolean().optional(),
	requiresAttribution: z.boolean().optional(),

	// Legacy aliases (will be mapped to primary fields)
	expirationDate: z.string().optional(), // Maps to licenseExpiryDate
	purchaseDate: z.string().optional(), // Maps to issueDate
	assignedTo: z.array(z.string()).optional(), // Maps to assignedManagers
	certificateFileId: z.string().optional(), // Maps to fileId
});

/**
 * Schema for license query parameters
 */
export const licenseQuerySchema = z.object({
	licenseId: z.string().min(1, "License ID is required"),
});

/**
 * Schema for license list query parameters.
 * Accepts null/undefined from URL searchParams and coerces to safe defaults.
 */
export const licenseListQuerySchema = z.object({
	limit: z
		.union([z.string(), z.number(), z.null(), z.undefined()])
		.transform((v) => (v == null || v === "" ? 1000 : Number(v)))
		.pipe(z.number().int().min(1).max(1000)),
	offset: z
		.union([z.string(), z.number(), z.null(), z.undefined()])
		.transform((v) => (v == null || v === "" ? 0 : Number(v)))
		.pipe(z.number().int().min(0)),
	search: z
		.union([z.string(), z.null(), z.undefined()])
		.transform((v) => (v == null || v === "" ? undefined : v)),
	vendor: z
		.union([z.string(), z.null(), z.undefined()])
		.transform((v) => (v == null || v === "" ? undefined : v)),
	licenseType: z
		.union([z.string(), z.null(), z.undefined()])
		.transform((v) => (v == null || v === "" ? undefined : v)),
	status: z
		.union([z.string(), z.null(), z.undefined()])
		.transform((v) => (v == null || v === "" ? undefined : v)),
	department: z
		.union([z.string(), z.null(), z.undefined()])
		.transform((v) => (v == null || v === "" ? undefined : v)),
	expiringSoon: z
		.union([z.string(), z.boolean(), z.null(), z.undefined()])
		.optional()
		.transform((v) =>
			v == null || v === "" ? undefined : v === "true" || v === true,
		),
});

/**
 * Schema for license allocation
 */
export const licenseAllocationSchema = z.object({
	userIds: z.array(z.string()).optional(),
	departments: z.array(z.string()).optional(),
	quantity: z.number().int().min(1).optional(),
});

/**
 * Schema for license renewal
 */
export const licenseRenewalSchema = z.object({
	renewalDate: z.string().min(1, "Renewal date is required"),
	cost: z.union([z.string(), z.number()]).optional(),
	currencyCode: z.string().optional().default("USD"),
	notes: z.string().optional(),
	extendExpiration: z.boolean().optional().default(true),
});

export type LicenseCreateInput = z.infer<typeof licenseCreateSchema>;
export type LicenseQueryInput = z.infer<typeof licenseQuerySchema>;
export type LicenseListQueryInput = z.infer<typeof licenseListQuerySchema>;
export type LicenseAllocationInput = z.infer<typeof licenseAllocationSchema>;
export type LicenseRenewalInput = z.infer<typeof licenseRenewalSchema>;

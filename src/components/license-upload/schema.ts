/**
 * Zod schema for License Upload Form validation
 */

import * as z from "zod";

export const licenseUploadSchema = z.object({
	licenseName: z
		.string()
		.min(1, "License name is required")
		.max(200, "Keep the name under 200 characters"),
	licenseNumber: z.string().optional(),
	licenseType: z.string().min(1, "License type is required"),
	category: z.string().optional(),
	status: z
		.enum([
			"active",
			"inactive",
			"expired",
			"pending-review",
			"suspended",
			"action-required",
		])
		.default("active"),
	licenseExpiryDate: z.date({ message: "Expiry date is required" }),
	issueDate: z.date().optional(),
	issuingAuthority: z.string().optional(),
	vendor: z.string().optional(),
	product: z.string().optional(),
	description: z.string().optional(),
	quantity: z.string().optional(),
	cost: z.string().optional(),
	currencyCode: z.string().default("USD"),
	division: z.string().optional(),
	department: z.string().optional(),
	assignedManagers: z.array(z.string()).optional(),
	autoRenew: z.boolean().default(false),
	renewalNoticeDays: z.string().optional(),
});

export type LicenseUploadFormData = z.infer<typeof licenseUploadSchema>;

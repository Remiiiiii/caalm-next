/**
 * Zod schema for License Upload Form validation
 */

import * as z from "zod";

export const licenseUploadSchema = z.object({
	licenseTypeId: z.string().min(1, "License type is required"),
	licenseName: z
		.string()
		.min(1, "Record name is required")
		.max(200, "Keep the name under 200 characters"),
	licenseNumber: z.string().optional(),
	licenseType: z.string().min(1, "License type is required"),
	category: z.string().optional(),
	entityCovered: z.string().optional(),
	renewalFrequency: z.string().optional(),
	fileLocation: z.string().optional(),
	// Type-specific fields (see src/lib/licenses/licenseTypeConfigs.ts)
	holderName: z.string().optional(),
	holderRole: z.string().optional(),
	licenseBoard: z.string().optional(),
	carrierName: z.string().optional(),
	policyNumber: z.string().optional(),
	coverageAmount: z.string().optional(),
	certificateHolder: z.string().optional(),
	backgroundScreeningStatus: z.string().optional(),
	agencyContractReference: z.string().optional(),
	hipaaComplianceRecord: z.string().optional(),
	substanceUseCertification: z.string().optional(),
	hrsaComplianceStatus: z.string().optional(),
	phsDeemedStatus: z.string().optional(),
	status: z
		.enum([
			"active",
			"inactive",
			"expired",
			"pending-review",
			"suspended",
			"action-required",
		])
		.default("pending-review"),
	licenseExpiryDate: z.date({ message: "Expiry date is required" }),
	issueDate: z.date().optional(),
	renewalDate: z.date().optional(),
	issuingAuthority: z
		.string()
		.min(1, "Issuing authority is required")
		.max(255, "Keep the issuing authority under 255 characters"),
	vendor: z.string().optional(),
	product: z.string().optional(),
	description: z.string().optional(),
	notes: z.string().optional(),
	quantity: z.string().optional(),
	cost: z.string().optional(),
	currencyCode: z.string().default("USD"),
	division: z.string().min(1, "Division is required"),
	department: z.string().min(1, "Department is required"),
	subDepartment: z.string().optional(),
	businessUnit: z.string().optional(),
	compliance: z
		.enum(["compliant", "non-compliant", "at-risk", "action-required"])
		.optional(),
	assignedManagers: z.array(z.string()).min(1, "Assigned To is required"),
	autoRenew: z.boolean().default(false),
	renewalNoticeDays: z.string().optional(),
});

export type LicenseUploadFormData = z.infer<typeof licenseUploadSchema>;

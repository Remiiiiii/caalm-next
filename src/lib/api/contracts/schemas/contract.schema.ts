import { z } from "zod";

/**
 * Schema for contract creation requests
 */
export const contractCreateSchema = z.object({
	contractName: z.string().min(1, "Contract name is required"),
	contractExpiryDate: z.string().optional(),
	contractType: z.string().optional(),
	vendor: z.string().optional(),
	contractNumber: z.string().optional(),
	amount: z.union([z.string(), z.number()]).optional(),
	currencyCode: z.string().optional().default("USD"),
	startDate: z.string().optional(),
	executionDate: z.string().optional(),
	expiryDate: z.string().optional(),
	autoRenew: z.boolean().optional(),
	renewalNoticeDays: z.union([z.string(), z.number()]).optional(),
	paymentTerms: z.string().optional(),
	paymentSchedule: z.string().optional(),
	budgetCode: z.string().optional(),
	costCenter: z.string().optional(),
	compliance: z.string().optional(),
	assignedManagers: z.array(z.string()).optional(),
	department: z.string().optional(),
	assignToDepartment: z.string().optional(),
	businessUnit: z.string().optional(),
	subDepartment: z.string().optional(),
	departmentOwner: z.string().optional(),
	contractCategory: z.string().optional(),
	counterpartyLegalName: z.string().optional(),
	priority: z.string().optional(),
	description: z.string().optional(),
	contractOwnerId: z.string().optional(),
	lifecycleStatus: z.string().optional(),
	riskLevel: z.string().optional(),
});

/**
 * Schema for contract query parameters
 */
export const contractQuerySchema = z.object({
	contractId: z.string().min(1, "Contract ID is required"),
});

/**
 * Schema for contract list query parameters
 */
export const contractListQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(1000).optional().default(1000),
	offset: z.coerce.number().int().min(0).optional().default(0),
	search: z.string().optional(),
});

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;
export type ContractQueryInput = z.infer<typeof contractQuerySchema>;
export type ContractListQueryInput = z.infer<typeof contractListQuerySchema>;

import { z } from "zod";

/**
 * Schema for draft creation/update requests
 */
export const draftCreateSchema = z.object({
	ownerId: z.string().min(1, "Owner ID is required"),
	accountId: z.string().min(1, "Account ID is required"),
	draftId: z.string().optional(),
	formData: z.record(z.unknown()).optional(),
	currentStep: z.number().int().min(1).max(10),
	processedFileData: z
		.object({
			name: z.string().min(1),
			type: z.string().optional(),
			size: z.number().optional(),
			lastModified: z.number().optional(),
			arrayBuffer: z.unknown().optional(),
			base64Content: z.string().optional(),
			bucketFileId: z.string().optional(),
		})
		.optional(),
	extractedData: z.record(z.unknown()).optional(),
	isCompleted: z.boolean().optional().default(false),
});

/**
 * Schema for draft query parameters
 */
export const draftQuerySchema = z.object({
	ownerId: z.string().min(1, "Owner ID is required"),
	draftId: z.string().optional(),
});

/**
 * Schema for draft deletion
 */
export const draftDeleteSchema = z.object({
	draftId: z.string().min(1, "Draft ID is required"),
	ownerId: z.string().optional(),
});

export type DraftCreateInput = z.infer<typeof draftCreateSchema>;
export type DraftQueryInput = z.infer<typeof draftQuerySchema>;
export type DraftDeleteInput = z.infer<typeof draftDeleteSchema>;

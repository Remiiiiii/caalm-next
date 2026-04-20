import { z } from "zod";

/**
 * Schema for extract data requests (JSON format)
 */
export const extractDataJsonSchema = z.object({
	fileName: z.string().optional(),
	fileType: z.string().optional(),
	fileSize: z.number().optional(),
	fileContent: z.string().min(1, "File content is required"),
});

/**
 * Schema for extract data requests (FormData format)
 * Note: FormData validation is handled differently in middleware
 */
export const extractDataFormDataSchema = z.object({
	file: z.instanceof(File, { message: "File is required" }),
});

export type ExtractDataJsonInput = z.infer<typeof extractDataJsonSchema>;
export type ExtractDataFormDataInput = z.infer<
	typeof extractDataFormDataSchema
>;

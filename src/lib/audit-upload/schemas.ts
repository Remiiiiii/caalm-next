import { z } from "zod";
import {
	AUDIT_SEVERITIES,
	AUDIT_TYPES,
	CONTROL_DEFICIENCY_TYPES,
	RECONCILIATION_VERDICTS,
} from "./types";

export const classificationSchema = z.object({
	documentType: z.string().min(1),
	auditType: z.enum(AUDIT_TYPES).optional().default("other"),
	frameworks: z.array(z.string()).default([]),
	period: z.string().nullable().optional(),
	periodStart: z.string().nullable().optional(),
	periodEnd: z.string().nullable().optional(),
	auditorName: z.string().nullable().optional(),
	reportNumber: z.string().nullable().optional(),
	reportDate: z.string().nullable().optional(),
	auditeeName: z.string().nullable().optional(),
	opinion: z.string().nullable().optional(),
});

export const extractedFindingSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	frameworkRefs: z.array(z.string()).default([]),
	severityReported: z.enum(AUDIT_SEVERITIES).nullable().optional(),
	likelihood: z.number().min(1).max(5).default(3),
	impact: z.number().min(1).max(5).default(3),
	confidence: z.number().min(0).max(1).default(0.6),
	citations: z
		.array(
			z.object({
				quote: z.string().min(1),
				page: z.number().nullable().optional(),
				section: z.string().nullable().optional(),
			}),
		)
		.default([]),
	findingCode: z.string().nullable().optional(),
	managementResponse: z.string().nullable().optional(),
	monetaryImpactUsd: z.number().nullable().optional(),
	controlDeficiencyType: z.enum(CONTROL_DEFICIENCY_TYPES).nullable().optional(),
});

export const sefaSchema = z
	.object({
		programs: z
			.array(
				z.object({
					name: z.string(),
					assistanceListing: z.string(),
					amountUsd: z.number(),
				}),
			)
			.default([]),
		totalUsd: z.number().nullable().optional(),
	})
	.nullable()
	.optional();

export const findingsExtractionSchema = z.object({
	summary: z.string().min(1),
	findings: z.array(extractedFindingSchema).default([]),
	sefa: sefaSchema,
});

export const reconciliationSchema = z.object({
	verdict: z.enum(RECONCILIATION_VERDICTS),
	rationale: z.string().min(1),
	matchedRequirementIds: z.array(z.string()).default([]),
	confidence: z.number().min(0).max(1).default(0.5),
	alsoSupported: z.boolean().optional(),
	suggestCreateReadiness: z.boolean().optional(),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;
export type ExtractedFinding = z.infer<typeof extractedFindingSchema>;
export type FindingsExtraction = z.infer<typeof findingsExtractionSchema>;
export type ReconciliationLlmResult = z.infer<typeof reconciliationSchema>;

import { z } from "zod";
import { model } from "@/lib/ai/gemini";
import {
	classifyAuditReportText,
	parseAuditReportFindings,
} from "./parse-report-findings";
import {
	classificationSchema,
	findingsExtractionSchema,
	reconciliationSchema,
	type ClassificationResult,
	type FindingsExtraction,
	type ReconciliationLlmResult,
} from "./schemas";
import type { ReadinessItem } from "./types";

function timeoutMs(): number {
	const raw = Number(process.env.AUDIT_AI_TIMEOUT_MS);
	return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

function extractJson(text: string): unknown {
	const trimmed = text.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const payload = fenced?.[1] ?? trimmed;
	return JSON.parse(payload);
}

async function callOverrideLlm(prompt: string): Promise<string> {
	const baseUrl = process.env.AUDIT_LLM_BASE_URL;
	const apiKey = process.env.AUDIT_LLM_API_KEY;
	const llmModel = process.env.AUDIT_LLM_MODEL || "gpt-4o-mini";
	if (!baseUrl || !apiKey) {
		throw new Error("AUDIT_LLM override is incomplete");
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs());
	try {
		const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			signal: controller.signal,
			body: JSON.stringify({
				model: llmModel,
				temperature: 0.1,
				response_format: { type: "json_object" },
				messages: [
					{
						role: "system",
						content: "Return only valid JSON that matches the requested schema.",
					},
					{ role: "user", content: prompt },
				],
			}),
		});
		if (!response.ok) {
			throw new Error(`AUDIT_LLM request failed (${response.status})`);
		}
		const json = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		return json.choices?.[0]?.message?.content || "";
	} finally {
		clearTimeout(timer);
	}
}

async function callGemini(prompt: string): Promise<string> {
	if (!process.env.GOOGLE_API_KEY) {
		throw new Error("GOOGLE_API_KEY is not set");
	}
	const result = await model.generateContent(prompt);
	return result.response.text();
}

async function completeJson<T>(
	prompt: string,
	schema: z.ZodType<T>,
	fallback: T,
): Promise<T> {
	const runners = process.env.AUDIT_LLM_BASE_URL
		? [callOverrideLlm, callGemini]
		: [callGemini];
	for (const runner of runners) {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			try {
				const raw = await runner(prompt);
				return schema.parse(extractJson(raw));
			} catch (error) {
				console.warn("[SERVER] auditLlm:", runner.name, error);
			}
		}
	}
	return fallback;
}

function heuristicFindings(text: string): FindingsExtraction {
	const parsed = parseAuditReportFindings(text);
	if (parsed.findings.length > 0) return parsed;
	const lines = text
		.split(/\n+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 40)
		.slice(0, 8);
	const findings = lines.map((line) => ({
		title: line.slice(0, 80),
		description: line.slice(0, 400),
		frameworkRefs: [] as string[],
		severityReported: null,
		likelihood: 3,
		impact: 3,
		confidence: 0.35,
		citations: [{ quote: line.slice(0, 180), page: null, section: null }],
		findingCode: null,
		managementResponse: null,
		monetaryImpactUsd: null,
		controlDeficiencyType: null,
	}));
	return {
		summary:
			text.slice(0, 280).trim() ||
			"No machine summary could be built from this file.",
		findings:
			findings.length > 0
				? findings
				: [
						{
							title: "Review item 1",
							description: text.slice(0, 400) || "No extractable finding text.",
							frameworkRefs: [],
							severityReported: null,
							likelihood: 2,
							impact: 2,
							confidence: 0.2,
							citations: [],
							findingCode: null,
							managementResponse: null,
							monetaryImpactUsd: null,
							controlDeficiencyType: null,
						},
					],
		sefa: parsed.sefa,
	};
}

function mergeExtractions(
	parsed: FindingsExtraction,
	llm: FindingsExtraction,
): FindingsExtraction {
	if (parsed.findings.length >= llm.findings.length) {
		return {
			...parsed,
			summary: llm.summary || parsed.summary,
			sefa: llm.sefa ?? parsed.sefa,
		};
	}
	return {
		...llm,
		sefa: llm.sefa ?? parsed.sefa,
	};
}

const EXTRACT_PROMPT = `Extract every finding from this audit report.
Return JSON with:
- summary
- sefa: {programs:[{name,assistanceListing,amountUsd}], totalUsd} or null
- findings:[{findingCode,title,description,frameworkRefs,severityReported,likelihood,impact,confidence,managementResponse,monetaryImpactUsd,controlDeficiencyType,citations:[{quote,page,section}]}]

Rules:
- Keep findingCode like F-01 or 2026-001.
- Copy Condition quotes verbatim from the source.
- likelihood and impact are 1-5.
- controlDeficiencyType is material_weakness, significant_deficiency, control_deficiency, or null.
- frameworks include SOC2, TSC refs (CC6.1), or UNIFORM_GUIDANCE / 2 CFR 200.
- monetaryImpactUsd is questioned costs or estimated exposure when stated.

Report:
`;

export async function classifyAuditDocument(
	text: string,
): Promise<ClassificationResult> {
	const fallback = classifyAuditReportText(text);
	return completeJson(
		`Classify this audit report. Return JSON {documentType, auditType, frameworks[], period, periodStart, periodEnd, auditorName, reportNumber, reportDate, auditeeName, opinion}.
auditType must be one of soc2_type2, financial_statement, compliance, other.
frameworks should include SOC2 and/or UNIFORM_GUIDANCE when those apply.

${text.slice(0, 12000)}`,
		classificationSchema,
		fallback,
	);
}

export async function extractAuditFindings(
	text: string,
): Promise<FindingsExtraction> {
	const parsed = parseAuditReportFindings(text);
	const llm = await completeJson(
		`${EXTRACT_PROMPT}${text.slice(0, 50000)}`,
		findingsExtractionSchema,
		parsed,
	);
	return mergeExtractions(parsed, llm);
}

export async function reconcileFindingWithReadiness(input: {
	title: string;
	description: string;
	frameworkRefs: string[];
	readiness: ReadinessItem[];
}): Promise<ReconciliationLlmResult> {
	const catalog = input.readiness
		.map(
			(item) =>
				`${item.requirementId}: ${item.label} (${item.status}${item.evidenceDate ? `; evidence ${item.evidenceDate}` : ""})${item.notes ? ` — ${item.notes}` : ""}`,
		)
		.join("\n");
	return completeJson(
		`Compare this finding to readiness items. Return JSON {verdict,rationale,matchedRequirementIds,confidence,alsoSupported,suggestCreateReadiness}.
Verdicts:
- false_finding: readiness is ready and evidence contradicts the auditor
- supported: readiness is gap or in_progress and agrees
- stale_readiness: readiness says ready but evidence is old or covers the wrong population
- severity_mismatch: the gap is real but auditor severity is two or more bands off
- untracked_gap: no matching readiness item (set suggestCreateReadiness true)
- needs_human_review: not enough to decide
Finding: ${input.title}
${input.description}
Refs: ${input.frameworkRefs.join(", ")}
Readiness:
${catalog}`,
		reconciliationSchema,
		{
			verdict: "needs_human_review",
			rationale: "AI reconciliation was unavailable; a person should review this finding.",
			matchedRequirementIds: [],
			confidence: 0.2,
		},
	);
}

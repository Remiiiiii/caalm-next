import { model } from "@/lib/ai/gemini";
import type { AuditReadinessSnapshotPayload } from "./types";
import { READINESS_DISCLAIMER } from "./types";

function payloadContext(payload: AuditReadinessSnapshotPayload): string {
	const s = payload.summary;
	return JSON.stringify(
		{
			disclaimer: READINESS_DISCLAIMER,
			score: s.readinessScore,
			ragStatus: s.ragStatus,
			sourcesUsed: payload.sourcesUsed,
			kpis: s.kpis,
			severity: s.severity,
			domains: s.domains,
			insights: s.insights.slice(0, 8),
			evidenceMapHits: payload.evidenceMapHits.slice(0, 12),
			siteCrawl: payload.siteCrawl
				? {
						websiteUrl: payload.siteCrawl.websiteUrl,
						healthHint: payload.siteCrawl.healthHint,
						issues: payload.siteCrawl.issues.slice(0, 8),
						pagesCrawled: payload.siteCrawl.pages.length,
					}
				: null,
			scoreDelta: payload.scoreDelta,
		},
		null,
		2,
	);
}

export async function generateReadinessAutoSummary(
	payload: AuditReadinessSnapshotPayload,
): Promise<string> {
	if (!process.env.GOOGLE_API_KEY) {
		const score = payload.summary.readinessScore;
		const critical = payload.summary.severity.critical;
		return [
			READINESS_DISCLAIMER,
			`Current CAALM readiness score: ${payload.sourcesUsed.length ? score : "n/a"} (${payload.summary.ragStatus}).`,
			`Critical items: ${critical}. Moderate: ${payload.summary.severity.moderate}.`,
			payload.scoreDelta !== null
				? `Change vs prior run: ${payload.scoreDelta >= 0 ? "+" : ""}${payload.scoreDelta}.`
				: "No prior snapshot for comparison.",
			"Prioritize non-compliant contracts and at-risk licenses before HRSA OSV, child-welfare monitoring, or financial PBC prep.",
		].join(" ");
	}

	const prompt = `You are CAALM's audit readiness assistant for nonprofit / FQHC / child-welfare organizations (e.g. CFCE).
Write a concise executive auto-summary (180-280 words) for org admins preparing for:
- HRSA Operational Site Visit (OSV)
- Child-welfare / CBC provider monitoring
- Financial PBC (contracts/grants/policies slice only — not GL/bank/SEFA)

Hard rules:
- Start by restating that this is CAALM readiness, NOT an official HRSA/DCF/CPA determination.
- Only use the JSON evidence provided.
- Prioritize critical and moderate gaps with concrete next actions in CAALM (Contracts / Licenses).
- If public site crawl data exists, mention it as informational only and not part of the score.
- Do not invent regulatory findings.

JSON:
${payloadContext(payload)}`;

	const result = await model.generateContent(prompt);
	return result.response.text().trim();
}

export async function answerReadinessQuestion(options: {
	payload: AuditReadinessSnapshotPayload;
	question: string;
	previousContext?: string;
}): Promise<{ answer: string; suggestedQuestions: string[] }> {
	if (!process.env.GOOGLE_API_KEY) {
		return {
			answer:
				"AI is not configured. Review Contracts and Licenses gaps on the readiness page, and remember this score is not an official audit determination.",
			suggestedQuestions: options.payload.summary.insights
				.slice(0, 3)
				.map((insight) => `What should we do about: ${insight.title}?`),
		};
	}

	const prompt = `You are CAALM's audit readiness AI assistant (similar to the contract document assistant).
Answer the user's question using only the readiness JSON. Be practical and specific.
Always remind once that CAALM readiness is not a regulator/CPA determination.
Also return 3 short follow-up questions.

Respond as JSON:
{"answer":"...","suggestedQuestions":["...","...","..."]}

Prior context: ${options.previousContext || "none"}
Question: ${options.question}

Readiness JSON:
${payloadContext(options.payload)}`;

	const result = await model.generateContent(prompt);
	const text = result.response.text().trim();
	try {
		const start = text.indexOf("{");
		const end = text.lastIndexOf("}");
		const parsed = JSON.parse(text.slice(start, end + 1)) as {
			answer: string;
			suggestedQuestions: string[];
		};
		return {
			answer: parsed.answer,
			suggestedQuestions: parsed.suggestedQuestions?.slice(0, 5) ?? [],
		};
	} catch {
		return {
			answer: text,
			suggestedQuestions: options.payload.summary.insights
				.slice(0, 3)
				.map((insight) => `What should we do about: ${insight.title}?`),
		};
	}
}

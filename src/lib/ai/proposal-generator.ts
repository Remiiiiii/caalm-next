import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonObjectFromModelText } from "@/lib/ai/contractTypeSuggestionSchema";
import type {
	ProposalLibraryEntry,
	ProposalRequirement,
	RequirementSection,
	ResponseType,
} from "@/lib/proposals/types";
import { isRequirementSection, isResponseType } from "@/lib/proposals/types";

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const jsonModel = genAI.getGenerativeModel({
	model: "gemini-3.5-flash-lite",
	generationConfig: {
		responseMimeType: "application/json",
		temperature: 0.2,
		maxOutputTokens: 8192,
	},
});

const MAX_CORPUS = 90000;

function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max)}\n…`;
}

function groundingRules(): string {
	return `Hard rules:
- Use only the provided solicitation and library text. Do not invent certifications, past performance, FAR clauses, page counts, or staffing.
- If a fact is missing, mark responseType as "clarification" and say it is not stated.
- Keep requirementText close to the source wording (shall / must / will).
- sourceSection must be one of L, M, C, attachment, other.
- responseType must be one of compliant, partial, exception, clarification, no_bid.`;
}

export type ShreddedRequirement = {
	requirementText: string;
	sourceSection: RequirementSection;
	sourcePage?: number;
	responseType: ResponseType;
	owner?: string;
};

export type OutlineSection = {
	heading: string;
	requirementIndexes: number[];
};

export function parseShreddedRequirements(raw: unknown): ShreddedRequirement[] {
	if (!Array.isArray(raw)) return [];
	const rows: ShreddedRequirement[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const requirementText =
			typeof row.requirementText === "string"
				? row.requirementText.trim()
				: "";
		if (!requirementText) continue;
		const sourcePage = Number(row.sourcePage);
		rows.push({
			requirementText,
			sourceSection: isRequirementSection(row.sourceSection)
				? row.sourceSection
				: "other",
			sourcePage:
				Number.isInteger(sourcePage) && sourcePage > 0 ? sourcePage : undefined,
			responseType: isResponseType(row.responseType)
				? row.responseType
				: "clarification",
			owner: typeof row.owner === "string" ? row.owner.trim() : undefined,
		});
	}
	return rows;
}

export function parseOutlineSections(raw: unknown): OutlineSection[] {
	if (!Array.isArray(raw)) return [];
	const sections: OutlineSection[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const heading = typeof row.heading === "string" ? row.heading.trim() : "";
		if (!heading) continue;
		const indexes = Array.isArray(row.requirementIndexes)
			? row.requirementIndexes
					.map((value) => Number(value))
					.filter((value) => Number.isInteger(value) && value >= 0)
			: [];
		sections.push({ heading, requirementIndexes: indexes });
	}
	return sections;
}

export function fallbackShred(corpus: string): ShreddedRequirement[] {
	const lines = corpus
		.split(/\n+/)
		.map((line) => line.trim())
		.filter((line) => /\b(shall|must|will)\b/i.test(line));
	const picked = (lines.length ? lines : corpus.split(/\n+/).filter(Boolean)).slice(
		0,
		40,
	);
	return picked.map((line, index) => ({
		requirementText: line.slice(0, 800),
		sourceSection: /\bsection\s*l\b/i.test(line)
			? "L"
			: /\bsection\s*m\b/i.test(line)
				? "M"
				: /\bsection\s*c\b/i.test(line)
					? "C"
					: "other",
		sourcePage: undefined,
		responseType: "clarification" as const,
		owner: index === 0 ? "Bid owner" : undefined,
	}));
}

export function fallbackOutline(
	requirements: Array<{ requirementText: string }>,
): OutlineSection[] {
	if (requirements.length === 0) {
		return [{ heading: "Technical approach", requirementIndexes: [] }];
	}
	return [
		{
			heading: "Understanding of the requirement",
			requirementIndexes: requirements.map((_, index) => index).slice(0, 8),
		},
		{
			heading: "Technical approach",
			requirementIndexes: requirements.map((_, index) => index).slice(8, 16),
		},
		{
			heading: "Past performance and staffing",
			requirementIndexes: requirements.map((_, index) => index).slice(16, 24),
		},
	].filter((section) => section.requirementIndexes.length > 0 || section.heading === "Technical approach");
}

export async function shredSolicitation(options: {
	corpus: string;
}): Promise<ShreddedRequirement[]> {
	const corpus = clip(options.corpus.trim(), MAX_CORPUS);
	if (!corpus) return [];
	if (!apiKey) return fallbackShred(corpus);

	const prompt = `You are CAALM's government proposal shredder.
Extract every shall/must/will, deliverable, page-limit, format rule, Section L instruction, and Section M evaluation factor.
Return JSON only:
{ "requirements": [{ "requirementText":"...", "sourceSection":"L|M|C|attachment|other", "sourcePage":1, "responseType":"clarification", "owner":"" }] }

${groundingRules()}

Solicitation:
${corpus}`;

	try {
		const result = await jsonModel.generateContent(prompt);
		const parsed = JSON.parse(
			extractJsonObjectFromModelText(result.response.text() || ""),
		) as Record<string, unknown>;
		const rows = parseShreddedRequirements(parsed.requirements);
		return rows.length ? rows : fallbackShred(corpus);
	} catch (error) {
		console.error("[SERVER] shredSolicitation:", error);
		return fallbackShred(corpus);
	}
}

export async function buildOutline(options: {
	requirements: ProposalRequirement[];
	library: ProposalLibraryEntry[];
}): Promise<OutlineSection[]> {
	if (!apiKey) return fallbackOutline(options.requirements);

	const prompt = `You are CAALM's proposal outline builder.
Group these compliance-matrix rows into proposal sections that follow typical federal volume structure (understanding, technical, management, past performance).
Return JSON only:
{ "sections": [{ "heading":"...", "requirementIndexes": [0,1] }] }

${groundingRules()}

Requirements:
${JSON.stringify(
			options.requirements.map((row, index) => ({
				index,
				text: row.requirementText,
				section: row.sourceSection,
			})),
		)}

Library titles:
${options.library.map((entry) => `- ${entry.kind}: ${entry.title}`).join("\n") || "(none)"}`;

	try {
		const result = await jsonModel.generateContent(prompt);
		const parsed = JSON.parse(
			extractJsonObjectFromModelText(result.response.text() || ""),
		) as Record<string, unknown>;
		const sections = parseOutlineSections(parsed.sections);
		return sections.length ? sections : fallbackOutline(options.requirements);
	} catch (error) {
		console.error("[SERVER] buildOutline:", error);
		return fallbackOutline(options.requirements);
	}
}

export async function draftSection(options: {
	heading: string;
	requirements: ProposalRequirement[];
	libraryMatches: ProposalLibraryEntry[];
	orgProfile?: string;
}): Promise<string> {
	const libraryBlock = options.libraryMatches
		.map((entry) => `### ${entry.title} (${entry.kind})\n${entry.bodyMarkdown}`)
		.join("\n\n");
	if (!apiKey) {
		const bullets = options.requirements
			.map((row) => `- ${row.requirementText}`)
			.join("\n");
		return `## ${options.heading}\n\nDraft this section against:\n${bullets || "- (no mapped requirements)"}\n\n${libraryBlock ? `Approved content:\n${libraryBlock}` : "Add approved library content, then regenerate."}`;
	}

	const prompt = `You are CAALM's government proposal writer.
Write a first-draft section in GitHub-flavored markdown for "${options.heading}".
Ground every claim in the requirements and library. Do not invent past performance.
Return JSON only: { "bodyMarkdown": "..." }

${groundingRules()}

Org profile:
${options.orgProfile || "(not provided)"}

Requirements:
${options.requirements.map((row) => `- [${row.sourceSection}] ${row.requirementText}`).join("\n") || "(none)"}

Approved library:
${libraryBlock || "(none)"}`;

	try {
		const result = await jsonModel.generateContent(prompt);
		const parsed = JSON.parse(
			extractJsonObjectFromModelText(result.response.text() || ""),
		) as Record<string, unknown>;
		const body =
			typeof parsed.bodyMarkdown === "string" ? parsed.bodyMarkdown.trim() : "";
		return body || `## ${options.heading}\n\nReview the mapped requirements and write this section.`;
	} catch (error) {
		console.error("[SERVER] draftSection:", error);
		return `## ${options.heading}\n\nAI drafting is unavailable. Write this section from the certified matrix.`;
	}
}

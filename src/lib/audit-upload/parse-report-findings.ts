import type { AuditSeverity, ControlDeficiencyType } from "./types";
import type { ClassificationResult, FindingsExtraction } from "./schemas";

const FINDING_HEADER =
	/(?:^|\n)((?:F-\d{2}|20\d{2}-\d{3}))\s+[—–-]\s+([^\n]+)/g;

const MONTHS: Record<string, string> = {
	january: "01",
	february: "02",
	march: "03",
	april: "04",
	may: "05",
	june: "06",
	july: "07",
	august: "08",
	september: "09",
	october: "10",
	november: "11",
	december: "12",
};

const SEVERITY_WORDS: Record<string, AuditSeverity> = {
	critical: "critical",
	high: "high",
	medium: "medium",
	low: "low",
	informational: "informational",
	info: "informational",
};

export function normalizeAuditExtractText(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/([^\n])Page\s+(\d+)/gi, "$1\n\nPage $2\n")
		.replace(/[ \t]+\n/g, "\n")
		.trim();
}

function parseEnglishDate(value: string): string | null {
	const match = value.match(
		/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
	);
	if (!match) return null;
	const month = MONTHS[match[1].toLowerCase()];
	if (!month) return null;
	return `${match[3]}-${month}-${match[2].padStart(2, "0")}`;
}

function dollarsToNumber(raw: string): number | null {
	const n = Number(raw.replace(/,/g, ""));
	return Number.isFinite(n) ? n : null;
}

function parseReportedSeverity(block: string): AuditSeverity | null {
	const labeled = block.match(/SEVERITY\s+([A-Za-z]+)/i);
	const word = (labeled?.[1] || "").toLowerCase();
	return SEVERITY_WORDS[word] ?? null;
}

function parseControlType(block: string): ControlDeficiencyType | null {
	const lower = block.toLowerCase();
	if (lower.includes("material weakness")) return "material_weakness";
	if (lower.includes("significant deficiency")) return "significant_deficiency";
	if (lower.includes("control deficiency")) return "control_deficiency";
	return null;
}

function parseFrameworkRefs(block: string, fallback: string[]): string[] {
	const refs = new Set<string>(fallback);
	const criteria = block.match(/CRITERIA\s+([\s\S]{0,240}?)(?:\n[A-Z][A-Z ]{3,}|\nCondition|\nAFFECTED|\nMAJOR)/i);
	const haystack = criteria?.[1] || block.slice(0, 400);
	for (const match of haystack.matchAll(
		/\b(TSC\s+)?(CC\d+(?:\.\d+)?|A\d+(?:\.\d+)?|C\d+(?:\.\d+)?)\b/gi,
	)) {
		refs.add((match[2] || match[0]).replace(/\s+/g, "").toUpperCase());
	}
	for (const match of haystack.matchAll(/\b2\s*CFR\s*200(?:\.\d+)?\b/gi)) {
		refs.add(match[0].replace(/\s+/g, " ").toUpperCase());
	}
	if (/uniform guidance|2 cfr part 200/i.test(block)) {
		refs.add("UNIFORM_GUIDANCE");
	}
	return [...refs];
}

function parseMoney(block: string): number | null {
	const questioned = block.match(
		/question(?:ed)?(?:\s+costs?)?[^$]{0,60}\$([0-9,]+(?:\.\d{2})?)/i,
	);
	if (questioned) return dollarsToNumber(questioned[1]);
	const exposure = block.match(
		/estimated exposure\s*\$([0-9,]+(?:\.\d{2})?)/i,
	);
	if (exposure) return dollarsToNumber(exposure[1]);
	return null;
}

function sectionAfter(block: string, label: string, stop: RegExp): string {
	const match = block.match(
		new RegExp(`${label}\\s*\\n([\\s\\S]*?)(?=${stop.source}|$)`, "i"),
	);
	return (match?.[1] || "").trim();
}

function firstSentences(text: string, maxChars = 280): string {
	const compact = text.replace(/\s+/g, " ").trim();
	if (!compact) return "";
	const cut = compact.split(/(?<=\.)\s+/).slice(0, 2).join(" ");
	return cut.slice(0, maxChars);
}

function inferLikelihoodImpact(
	reported: AuditSeverity | null,
	block: string,
	controlType: ControlDeficiencyType | null,
): { likelihood: number; impact: number } {
	const lower = block.toLowerCase();
	let impact =
		reported === "critical" ? 5 : reported === "high" ? 4 : reported === "low" ? 2 : 3;
	let likelihood = 3;
	if (controlType === "material_weakness") {
		likelihood = 4;
		impact = 4;
	}
	if (/unscanned|internet-facing|subnet|scan coverage/.test(lower)) {
		likelihood = 4;
		impact = 4;
	}
	if (/multi-factor|mfa not/.test(lower)) {
		likelihood = 2;
		impact = 4;
	}
	if (/tabletop|incident response/.test(lower)) {
		likelihood = 2;
		impact = 4;
	}
	if (/backup|restoration testing/.test(lower)) {
		likelihood = 3;
		impact = 4;
	}
	return { likelihood, impact };
}

function parseSefa(text: string): FindingsExtraction["sefa"] {
	const programs: NonNullable<FindingsExtraction["sefa"]>["programs"] = [];
	for (const match of text.matchAll(
		/([A-Za-z][A-Za-z0-9 &(),.\-]{6,80}?)(\d{2}\.\d{3})\s*\$([0-9,]+)/g,
	)) {
		const name = match[1].replace(/Federal program.*$/i, "").trim();
		if (!name || /total federal/i.test(name)) continue;
		const amountUsd = dollarsToNumber(match[3]);
		if (amountUsd == null) continue;
		programs.push({
			name,
			assistanceListing: match[2],
			amountUsd,
		});
	}
	const totalMatch = text.match(/Total federal expenditures\s*\$([0-9,]+)/i);
	if (programs.length === 0 && !totalMatch) return null;
	return {
		programs,
		totalUsd: totalMatch ? dollarsToNumber(totalMatch[1]) : programs.reduce((sum, row) => sum + row.amountUsd, 0),
	};
}

export function classifyAuditReportText(text: string): ClassificationResult {
	const lower = text.toLowerCase();
	const isSoc2 = /soc\s*2/.test(lower);
	const isType2 = /type\s*ii|type\s*2/.test(lower);
	const isSingle = /single audit|uniform guidance|2 cfr part 200/.test(lower);
	const frameworks: string[] = [];
	if (isSoc2) frameworks.push("SOC2");
	if (/trust services|tsc /.test(lower)) frameworks.push("TSC");
	if (isSingle) frameworks.push("UNIFORM_GUIDANCE");
	const reportNumber =
		text.match(/REPORT NUMBER\s+([A-Z0-9-]+)/i)?.[1] ||
		text.match(/\b(SR-\d{4}-\d+|WRA-\d{4}-[A-Z]+-\d+)\b/)?.[1] ||
		null;
	const auditorName =
		text.match(
			/^([A-Z][A-Za-z&,.\s]{6,80}(?:LLP|CPAs?|LLP —))/m,
		)?.[1]
			?.replace(/\s+—.*$/, "")
			.trim() ||
		text.match(/\b([A-Z][A-Za-z&,.\s]{4,50}(?:LLP|CPAs?))\b/)?.[1] ||
		null;
	const periodLine =
		text.match(
			/AUDIT PERIOD\s+([\s\S]{0,80}?)(?:\nREPORT DATE|\nCRITERIA|\nFEDERAL)/i,
		)?.[1] || "";
	const dates = [...text.matchAll(
		/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
	)].map((match) => parseEnglishDate(match[0]));
	const periodStart = parseEnglishDate(periodLine) || dates[0] || null;
	const periodEnd =
		parseEnglishDate(periodLine.split(/[–-]/).slice(1).join("-")) ||
		dates[1] ||
		null;
	const reportDate =
		parseEnglishDate(
			text.match(/REPORT DATE\s+([^\n]+)/i)?.[1] || "",
		) || dates[2] || null;
	const auditeeName =
		text.match(/AUDITEE\s+([^\n(]+)/i)?.[1]?.trim() || null;
	const opinion = /except for the matters described/i.test(text)
		? "qualified"
		: /in our opinion/i.test(text)
			? "unqualified"
			: null;

	return {
		documentType: isSingle
			? "single_audit"
			: isSoc2
				? "soc2_report"
				: "audit_report",
		auditType: isSoc2 && isType2
			? "soc2_type2"
			: isSingle
				? "compliance"
				: "other",
		frameworks,
		period:
			periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : periodLine.trim() || null,
		periodStart,
		periodEnd,
		auditorName,
		reportNumber,
		reportDate,
		auditeeName,
		opinion,
	};
}

export function parseAuditReportFindings(text: string): FindingsExtraction {
	const normalized = normalizeAuditExtractText(text);
	const headers = [...normalized.matchAll(FINDING_HEADER)];
	const findings = headers.map((header, index) => {
		const start = header.index ?? 0;
		const end = headers[index + 1]?.index ?? normalized.length;
		const block = normalized.slice(start, end);
		const findingCode = header[1];
		const title = header[2].trim();
		const condition = sectionAfter(
			block,
			"Condition",
			/Auditor'?s Recommendation|Management Response/,
		);
		const managementResponse = sectionAfter(
			block,
			"Management Response",
			/\n(?:F-\d{2}|20\d{2}-\d{3})\s+[—–-]/,
		);
		const recommendation = sectionAfter(
			block,
			"Auditor'?s Recommendation",
			/Management Response/,
		);
		const severityReported = parseReportedSeverity(block);
		const controlDeficiencyType = parseControlType(block);
		const { likelihood, impact } = inferLikelihoodImpact(
			severityReported,
			block,
			controlDeficiencyType,
		);
		const quote = firstSentences(condition);
		const description = [condition, recommendation]
			.filter(Boolean)
			.join("\n\n")
			.slice(0, 4000) || title;
		const extraFrameworks: string[] = [];
		if (/TSC|CC\d/i.test(block)) extraFrameworks.push("SOC2");
		if (/2 CFR|Uniform Guidance/i.test(block)) extraFrameworks.push("UNIFORM_GUIDANCE");
		return {
			findingCode,
			title: `${findingCode} — ${title}`,
			description,
			frameworkRefs: parseFrameworkRefs(block, extraFrameworks),
			severityReported,
			likelihood,
			impact,
			confidence: 0.72,
			citations: quote
				? [{ quote, page: null, section: "Condition" }]
				: [],
			managementResponse: managementResponse || null,
			monetaryImpactUsd: parseMoney(block),
			controlDeficiencyType,
		};
	});

	const classification = classifyAuditReportText(normalized);
	const summaryParts = [
		classification.opinion === "qualified"
			? "Qualified opinion (except for the listed findings)."
			: classification.opinion
				? "Unqualified opinion."
				: "Audit report extracted.",
		findings.length
			? `${findings.length} findings were read from the report.`
			: "No numbered findings were detected.",
	];

	return {
		summary: summaryParts.join(" "),
		findings,
		sefa: parseSefa(normalized),
	};
}

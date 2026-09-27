/**
 * Shared headings for GitHub's Issues → New issue form
 * (.github/ISSUE_TEMPLATE/bug.yml) and CAALM engineering tickets.
 * Keep the YAML `label` values in sync with BUG_REPORT_HEADINGS.
 */

export const BUG_REPORT_HEADINGS = {
	steps: "Reproduction steps",
	expected: "Expected behavior",
	actual: "Actual behavior",
	os: "OS",
	environment: "Environment",
} as const;

export const BUG_REPORT_OS = ["Windows", "macOS", "Linux", "Other"] as const;
export type BugReportOs = (typeof BUG_REPORT_OS)[number];

export const BUG_REPORT_ENVIRONMENTS = [
	"Production",
	"Preview",
	"Local",
] as const;
export type BugReportEnvironment = (typeof BUG_REPORT_ENVIRONMENTS)[number];

export const BUG_CONFIRM_SEARCHED =
	"I searched existing tickets and GitHub issues";
export const BUG_CONFIRM_IS_BUG =
	"This is a product bug, not a Help / support request";

export type EngineeringBugFields = {
	steps: string;
	expected: string;
	actual: string;
	os: BugReportOs;
	environment: BugReportEnvironment;
	searchedExisting: boolean;
	isBug: boolean;
	extra?: string;
};

export function headingMarkdown(label: string): string {
	return `### ${label}`;
}

export function composeEngineeringBugDescription(
	fields: EngineeringBugFields,
): string {
	const blocks = [
		`${headingMarkdown(BUG_REPORT_HEADINGS.steps)}\n\n${fields.steps.trim()}`,
		`${headingMarkdown(BUG_REPORT_HEADINGS.expected)}\n\n${fields.expected.trim()}`,
		`${headingMarkdown(BUG_REPORT_HEADINGS.actual)}\n\n${fields.actual.trim()}`,
		`${headingMarkdown(BUG_REPORT_HEADINGS.os)}\n\n${fields.os}`,
		`${headingMarkdown(BUG_REPORT_HEADINGS.environment)}\n\n${fields.environment}`,
	];
	if (fields.extra?.trim()) {
		blocks.push(`### Additional context\n\n${fields.extra.trim()}`);
	}
	blocks.push(
		[
			"### Confirmations",
			"",
			`- [${fields.searchedExisting ? "x" : " "}] ${BUG_CONFIRM_SEARCHED}`,
			`- [${fields.isBug ? "x" : " "}] ${BUG_CONFIRM_IS_BUG}`,
		].join("\n"),
	);
	return blocks.join("\n\n");
}

export function parseBugReportOs(value: unknown): BugReportOs {
	const os = String(value || "").trim();
	if ((BUG_REPORT_OS as readonly string[]).includes(os)) {
		return os as BugReportOs;
	}
	throw new Error("Invalid OS");
}

export function parseBugReportEnvironment(
	value: unknown,
): BugReportEnvironment {
	const environment = String(value || "").trim();
	if ((BUG_REPORT_ENVIRONMENTS as readonly string[]).includes(environment)) {
		return environment as BugReportEnvironment;
	}
	throw new Error("Invalid environment");
}

function requiredText(value: unknown, field: string, min = 8): string {
	const text = String(value || "").trim();
	if (text.length < min) {
		throw new Error(`Invalid ${field}`);
	}
	return text;
}

function parseTruthy(value: unknown): boolean {
	return value === true || value === "true" || value === "on" || value === "1";
}

export function parseEngineeringBugFields(input: {
	steps?: unknown;
	expected?: unknown;
	actual?: unknown;
	os?: unknown;
	environment?: unknown;
	searchedExisting?: unknown;
	isBug?: unknown;
	extra?: unknown;
}): EngineeringBugFields {
	const extra = String(input.extra || "").trim();
	const fields: EngineeringBugFields = {
		steps: requiredText(input.steps, "reproduction steps"),
		expected: requiredText(input.expected, "expected behavior"),
		actual: requiredText(input.actual, "actual behavior"),
		os: parseBugReportOs(input.os),
		environment: parseBugReportEnvironment(input.environment),
		searchedExisting: parseTruthy(input.searchedExisting),
		isBug: parseTruthy(input.isBug),
		extra: extra || undefined,
	};
	if (!fields.searchedExisting || !fields.isBug) {
		throw new Error("Invalid confirmations");
	}
	return fields;
}

export function detectBugReportOs(
	userAgent: string,
	platform?: string,
): BugReportOs {
	const haystack = `${userAgent} ${platform ?? ""}`.toLowerCase();
	if (haystack.includes("win")) return "Windows";
	if (
		haystack.includes("mac") ||
		haystack.includes("iphone") ||
		haystack.includes("ipad")
	) {
		return "macOS";
	}
	if (haystack.includes("linux") || haystack.includes("android")) {
		return "Linux";
	}
	return "Other";
}

export function detectBugReportEnvironment(
	hostname: string,
): BugReportEnvironment {
	const host = hostname.toLowerCase();
	if (
		host === "localhost" ||
		host === "127.0.0.1" ||
		host === "::1" ||
		host.endsWith(".local")
	) {
		return "Local";
	}
	if (host.includes("vercel.app") || host.startsWith("preview.")) {
		return "Preview";
	}
	return "Production";
}

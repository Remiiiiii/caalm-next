import type { BlueprintId, WizardIntake } from "@/types/contract-templates";
import {
	isOrgLetterheadToken,
	ORG_LETTERHEAD_TOKENS,
	type OrgLetterheadToken,
} from "./org-letterhead";
import manifest from "./blueprint-token-manifest.json";

export const GOVERNMENT_CONTRACT_TYPES = [
	{ value: "firm-fixed-price", label: "Firm-fixed-price" },
	{ value: "cost-reimbursement", label: "Cost-reimbursement" },
	{ value: "time-and-materials", label: "Time-and-materials" },
] as const;

export type TokenDataType = "string" | "date" | "currency" | "longtext";
export type TokenSource = "intake" | "manual" | "esign" | "org";
export type TokenGroup =
	| "parties"
	| "dates"
	| "terms"
	| "compensation"
	| "legal"
	| "signatures"
	| "record";
export type FillSectionId = TokenGroup | "added";
export type DocxHeading = { number: number; title: string };

export type TokenFieldDef = {
	token: string;
	label: string;
	group: TokenGroup;
	dataType: TokenDataType;
	required: boolean;
	source: TokenSource;
	schemaField?: keyof WizardIntake;
	readOnly?: boolean;
};

const COUNTERPARTY_TOKENS = new Set([
	"VENDOR_NAME",
	"GRANTEE_NAME",
	"CONTRACTOR_NAME",
	"TENANT_NAME",
	"CONSULTANT_NAME",
	"PARTY_B_NAME",
	"DONOR_NAME",
	"SPONSORED_PROJECT_NAME",
	"EMPLOYEE_NAME",
]);

const AMOUNT_TOKENS = new Set([
	"BUDGET",
	"RENT_AMOUNT",
	"SALARY_AMOUNT",
	"GIFT_VALUE",
]);

const LONGTEXT_TOKENS = new Set([
	"SCOPE_OF_WORK",
	"GRANT_PURPOSE_DESCRIPTION",
	"MOU_PURPOSE",
	"PARTY_A_RESPONSIBILITIES",
	"PARTY_B_RESPONSIBILITIES",
	"GIFT_DESCRIPTION",
	"GIFT_PURPOSE",
	"PROJECT_DESCRIPTION",
	"JOB_DUTIES_DESCRIPTION",
	"ADDITIONAL_FAR_CLAUSES",
	"QUALITY_STANDARDS",
	"SLA_TERMS",
	"IP_OWNERSHIP_TERMS",
	"NON_COMPETE_TERMS",
	"HEALTH_BENEFITS_TERMS",
	"PTO_TERMS",
	"RETIREMENT_BENEFITS_TERMS",
	"OTHER_BENEFITS_TERMS",
	"SEVERANCE_TERMS",
	"EMPLOYMENT_TYPE_TERMS",
	"BONUS_COMMISSION_TERMS",
	"PROBATIONARY_PERIOD_TERMS",
]);

const DATE_TOKENS = new Set([
	"DATE",
	"END_DATE",
	"FINAL_REPORT_DEADLINE",
	"PAYMENT_DUE_DATE",
]);

function humanLabel(token: string): string {
	return token
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function groupFor(token: string): TokenGroup {
	if (token.includes("SIGNATURE") || token.includes("SIGNEE")) {
		return "signatures";
	}
	if (DATE_TOKENS.has(token) || token.endsWith("_DATE")) return "dates";
	if (
		AMOUNT_TOKENS.has(token) ||
		token.includes("PAYMENT") ||
		token.includes("FEE") ||
		token.includes("SALARY") ||
		token.includes("RENT") ||
		token.includes("DEPOSIT")
	) {
		return "compensation";
	}
	if (token.includes("GOVERNING") || token.includes("FAR")) return "legal";
	if (token.endsWith("_NAME") && !token.includes("SIGNEE")) return "parties";
	return "terms";
}

export function isSignatureLockToken(token: string): boolean {
	return token.endsWith("_SIGNATURE_HASH") || token.endsWith("_SIGNATURE_TIMESTAMP");
}

export function defineToken(token: string): TokenFieldDef {
	if (isOrgLetterheadToken(token)) {
		return {
			token,
			label: humanLabel(token),
			group: "record",
			dataType: "string",
			required: false,
			source: "org",
			readOnly: true,
		};
	}

	if (isSignatureLockToken(token)) {
		return {
			token,
			label: humanLabel(token),
			group: "signatures",
			dataType: "string",
			required: false,
			source: "esign",
			readOnly: true,
		};
	}

	if (COUNTERPARTY_TOKENS.has(token)) {
		return {
			token,
			label: humanLabel(token),
			group: "parties",
			dataType: "string",
			required: true,
			source: "intake",
			schemaField: "counterparty",
		};
	}
	if (token === "DATE") {
		return {
			token,
			label: "Effective date",
			group: "dates",
			dataType: "date",
			required: true,
			source: "intake",
			schemaField: "startDate",
		};
	}
	if (token === "END_DATE") {
		return {
			token,
			label: "End date",
			group: "dates",
			dataType: "date",
			required: true,
			source: "intake",
			schemaField: "expiryDate",
		};
	}
	if (AMOUNT_TOKENS.has(token)) {
		return {
			token,
			label: humanLabel(token),
			group: "compensation",
			dataType: "currency",
			required: true,
			source: "intake",
			schemaField: "amount",
		};
	}
	if (token === "GOVERNING_STATE") {
		return {
			token,
			label: "Governing law",
			group: "legal",
			dataType: "string",
			required: false,
			source: "intake",
			schemaField: "governingLaw",
		};
	}

	return {
		token,
		label: humanLabel(token),
		group: groupFor(token),
		dataType: LONGTEXT_TOKENS.has(token)
			? "longtext"
			: DATE_TOKENS.has(token)
				? "date"
				: "string",
		required: token.endsWith("_NAME") && !token.includes("SIGNEE"),
		source: "manual",
	};
}

export function tokensForBlueprint(blueprintId: string): string[] {
	const list = (manifest as Record<string, string[]>)[blueprintId];
	return Array.isArray(list) ? list : [];
}

export function tokenDefsForBlueprint(blueprintId: string): TokenFieldDef[] {
	return tokensForBlueprint(blueprintId).map(defineToken);
}

export type VisibleFillField =
	| {
			kind: "intake";
			intakeField: keyof WizardIntake;
			label: string;
			dataType: TokenDataType;
			required: boolean;
			tokens: string[];
			group: TokenGroup;
			dividerBefore?: boolean;
	  }
	| {
			kind: "token";
			token: string;
			label: string;
			dataType: TokenDataType;
			required: boolean;
			group: TokenGroup;
			dividerBefore?: boolean;
	  };

/** One UI field per intake mapping, plus unmapped fillable tokens. */
export function getVisibleFillFields(blueprintId: string): VisibleFillField[] {
	const defs = tokenDefsForBlueprint(blueprintId).filter(
		(def) => !def.readOnly,
	);
	const seenIntake = new Set<keyof WizardIntake>();
	const fields: VisibleFillField[] = [
		{
			kind: "intake",
			intakeField: "contractName",
			label: "Contract name",
			dataType: "string",
			required: true,
			tokens: [],
			group: "record",
		},
		{
			kind: "intake",
			intakeField: "department",
			label: "Department",
			dataType: "string",
			required: false,
			tokens: [],
			group: "record",
		},
		{
			kind: "intake",
			intakeField: "currency",
			label: "Currency",
			dataType: "string",
			required: false,
			tokens: [],
			group: "record",
			dividerBefore: true,
		},
	];

	for (const def of defs) {
		if (def.schemaField) {
			if (seenIntake.has(def.schemaField)) {
				const existing = fields.find(
					(field) =>
						field.kind === "intake" && field.intakeField === def.schemaField,
				);
				if (existing && existing.kind === "intake") {
					existing.tokens.push(def.token);
				}
				continue;
			}
			seenIntake.add(def.schemaField);
			fields.push({
				kind: "intake",
				intakeField: def.schemaField,
				label: def.label,
				dataType: def.dataType,
				required: def.required,
				tokens: [def.token],
				group: def.group,
			});
			continue;
		}
		fields.push({
			kind: "token",
			token: def.token,
			label: def.label,
			dataType: def.dataType,
			required: def.required,
			group: def.group,
		});
	}
	return fields;
}

export function parseAmountInput(raw: string): string {
	const cleaned = raw.replace(/[^0-9.]/g, "");
	if (!cleaned) return "";
	const dot = cleaned.indexOf(".");
	if (dot === -1) return cleaned;
	const whole = cleaned.slice(0, dot) || "0";
	const decimals = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
	return decimals.length > 0 ? `${whole}.${decimals}` : whole;
}

function currencySymbol(currency: string): string {
	const code = /^[A-Za-z]{3}$/.test(currency.trim())
		? currency.trim().toUpperCase()
		: "USD";
	try {
		const part = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: code,
		})
			.formatToParts(0)
			.find((row) => row.type === "currency");
		return part?.value || "$";
	} catch {
		return "$";
	}
}

export function formatAmountWhileTyping(raw: string, currency = "USD"): string {
	if (!raw.trim()) return "";
	const cleaned = raw.replace(/[^0-9.]/g, "");
	const hasDot = cleaned.includes(".");
	const [wholeRaw, fracRaw = ""] = cleaned.split(".");
	const whole = wholeRaw === "" ? "0" : String(Number(wholeRaw));
	const grouped = Number(whole).toLocaleString("en-US");
	const symbol = currencySymbol(currency);
	if (!hasDot) return `${symbol}${grouped}`;
	return `${symbol}${grouped}.${fracRaw.slice(0, 2)}`;
}

export function formatAmountForDocument(
	raw: string,
	currency = "USD",
): string {
	const amount = Number(raw);
	if (!raw.trim() || Number.isNaN(amount)) return raw.trim();
	const code = /^[A-Za-z]{3}$/.test(currency.trim())
		? currency.trim().toUpperCase()
		: "USD";
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: code,
		}).format(amount);
	} catch {
		return amount.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}
}

export function buildMergeTokenValues(
	blueprintId: string,
	intake: WizardIntake,
	tokenValues: Record<string, string>,
	orgValues?: Partial<Record<OrgLetterheadToken, string>>,
): Record<string, string> {
	const values: Record<string, string> = {};
	for (const def of tokenDefsForBlueprint(blueprintId)) {
		if (def.readOnly) continue;
		if (def.schemaField) {
			const raw = String(intake[def.schemaField] || "").trim();
			values[def.token] =
				def.dataType === "currency"
					? formatAmountForDocument(raw, intake.currency)
					: raw;
			continue;
		}
		values[def.token] = String(tokenValues[def.token] || "").trim();
	}
	for (const token of ORG_LETTERHEAD_TOKENS) {
		values[token] = String(orgValues?.[token] || "").trim();
	}
	return values;
}

const HEADING_KEYWORDS: Record<Exclude<TokenGroup, "signatures" | "record">, string[]> = {
	parties: ["part", "parties"],
	dates: ["term", "duration", "period"],
	compensation: ["consideration", "payment", "compensation", "rent", "salary"],
	terms: ["scope", "statement of work", "services", "purpose", "duties"],
	legal: ["governing", "law", "far", "compliance"],
};

export function parseDocxHeadings(html: string): DocxHeading[] {
	return [...html.matchAll(/<p class="docx-heading"><strong>\s*(\d+)\.\s*([^<]+)/g)].map(
		(match) => ({
			number: Number(match[1]),
			title: match[2].replace(/\.$/, "").trim(),
		}),
	);
}

export function clauseForGroup(
	group: TokenGroup,
	headings: DocxHeading[],
): DocxHeading | null {
	const keywords = HEADING_KEYWORDS[group as keyof typeof HEADING_KEYWORDS];
	if (!keywords || headings.length === 0) return null;
	return (
		headings.find((heading) => {
			const title = heading.title.toLowerCase();
			return keywords.some((word) => title.includes(word));
		}) || null
	);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap filled token values so the live preview can highlight and scroll to them. */
export function markLiveTokenHtml(
	html: string,
	tokenValues: Record<string, string>,
): string {
	const entries = Object.entries(tokenValues)
		.filter(([, value]) => value.trim().length >= 2)
		.sort((a, b) => b[1].length - a[1].length);
	let next = html;
	for (const [token, value] of entries) {
		if (next.includes(`data-token="${token}"`)) continue;
		const pattern = new RegExp(escapeRegExp(value), "");
		next = next.replace(
			pattern,
			`<span data-token="${token}" class="docx-live-token">$&</span>`,
		);
	}
	return next;
}

export function applyTokenToIntake(
	intake: WizardIntake,
	token: string,
	value: string,
): WizardIntake {
	const def = defineToken(token);
	if (!def.schemaField) return intake;
	return { ...intake, [def.schemaField]: value };
}

export function validateBlueprintTokens(
	blueprintId: BlueprintId | string | null,
	intake: WizardIntake,
	tokenValues: Record<string, string>,
): string[] {
	const errors: string[] = [];
	if (!intake.contractName.trim()) errors.push("Name the contract");
	if (!blueprintId) {
		errors.push("Choose an agreement blueprint");
		return errors;
	}
	for (const field of getVisibleFillFields(blueprintId)) {
		if (!field.required) continue;
		const value =
			field.kind === "intake"
				? String(intake[field.intakeField] || "").trim()
				: String(tokenValues[field.token] || "").trim();
		if (!value) errors.push(`Fill ${field.label}`);
	}
	return errors;
}

export function filledTokenPercent(
	blueprintId: string | null,
	intake: WizardIntake,
	tokenValues: Record<string, string>,
): number {
	if (!blueprintId) return 0;
	const fields = getVisibleFillFields(blueprintId).filter(
		(field) => field.required,
	);
	if (fields.length === 0) return 0;
	const filled = fields.filter((field) => {
		const value =
			field.kind === "intake"
				? String(intake[field.intakeField] || "").trim()
				: String(tokenValues[field.token] || "").trim();
		return value.length > 0;
	}).length;
	return Math.round((filled / fields.length) * 100);
}

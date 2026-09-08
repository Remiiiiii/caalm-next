import type { BlueprintId, WizardIntake } from "@/types/contract-templates";
import manifest from "./blueprint-token-manifest.json";
import {
	isOrgLetterheadToken,
	ORG_LETTERHEAD_TOKENS,
	type OrgLetterheadToken,
} from "./org-letterhead";

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
	return (
		token.endsWith("_SIGNATURE_HASH") || token.endsWith("_SIGNATURE_TIMESTAMP")
	);
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
	if (token === "ADDITIONAL_FAR_CLAUSES") {
		return {
			token,
			label: "Additional FAR clauses",
			group: "legal",
			dataType: "longtext",
			required: false,
			source: "manual",
		};
	}
	if (token === "SCOPE_OF_WORK") {
		return {
			token,
			label: "Statement of work",
			group: "terms",
			dataType: "longtext",
			required: false,
			source: "manual",
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

/** Example text so authors know what each merge field expects. */
const TOKEN_PLACEHOLDERS: Record<string, string> = {
	CLIENT_NAME: "e.g. Acme Health Services",
	VENDOR_NAME: "e.g. Northwind Consulting LLC",
	GRANTOR_NAME: "e.g. State Health Foundation",
	GRANTEE_NAME: "e.g. Community Care Nonprofit",
	CONTRACTING_AGENCY: "e.g. U.S. Department of Health",
	CONTRACTOR_NAME: "e.g. Apex Solutions Inc.",
	LANDLORD_NAME: "e.g. Riverfront Properties LLC",
	TENANT_NAME: "e.g. Bright Path Clinic",
	CONSULTANT_NAME: "e.g. Jordan Lee",
	PARTY_A_NAME: "e.g. County Behavioral Health",
	PARTY_B_NAME: "e.g. Partner Agency Inc.",
	DONOR_NAME: "e.g. Smith Family Foundation",
	RECIPIENT_NAME: "e.g. CAALM Community Fund",
	COMPANY_NAME: "e.g. CAALM Solutions",
	EMPLOYEE_NAME: "e.g. Alex Rivera",
	SPONSOR_NAME: "e.g. Fiscal Sponsor Org",
	SPONSORED_PROJECT_NAME: "e.g. Youth Mentorship Project",
	SCOPE_OF_WORK: "Describe the services or deliverables in 2–4 sentences…",
	GRANT_PURPOSE_DESCRIPTION:
		"e.g. Expand outpatient behavioral health capacity in rural counties",
	MOU_PURPOSE: "e.g. Coordinate referral pathways between both organizations",
	PARTY_A_RESPONSIBILITIES: "List Party A’s duties, one item per line…",
	PARTY_B_RESPONSIBILITIES: "List Party B’s duties, one item per line…",
	GIFT_DESCRIPTION: "e.g. Unrestricted cash gift for operating support",
	GIFT_PURPOSE: "e.g. Fund scholarships for the 2026 program year",
	PROJECT_DESCRIPTION:
		"Summarize the sponsored project’s goals and activities…",
	JOB_DUTIES_DESCRIPTION: "List primary duties and expectations…",
	QUALITY_STANDARDS: "e.g. Industry best practices and documented QC reviews",
	SLA_TERMS: "e.g. 99.5% uptime; critical tickets answered within 4 hours",
	RENEWAL_TERMS:
		"e.g. Auto-renews for one year unless either party gives 60 days’ notice",
	BUDGET: "e.g. 500000",
	RENT_AMOUNT: "e.g. 4500",
	SALARY_AMOUNT: "e.g. 85000",
	GIFT_VALUE: "e.g. 25000",
	PAYMENT_SCHEDULE: "e.g. four equal quarterly installments",
	INVOICING_TERMS: "e.g. Net 30 from invoice date; submit invoices monthly",
	LATE_FEE_TERMS: "e.g. 1.5% per month on unpaid balances after the due date",
	IP_OWNERSHIP_TERMS: "e.g. Work product is owned by Client upon full payment",
	CURE_PERIOD: "e.g. 15 days after written notice",
	NOTICE_PERIOD: "e.g. 30 days’ prior written notice",
	GOVERNING_STATE: "e.g. Delaware",
	REPORTING_FREQUENCY: "e.g. quarterly progress reports",
	RECORD_RETENTION_PERIOD: "e.g. seven (7) years after final payment",
	PREMISES_ADDRESS: "e.g. 123 Main Street, Suite 400, Austin, TX 78701",
	SQUARE_FOOTAGE: "e.g. 2,400",
	PERMITTED_USE: "e.g. General office and outpatient counseling services",
	RENT_FREQUENCY: "e.g. monthly, due on the first of each month",
	SECURITY_DEPOSIT: "e.g. equal to one month’s rent",
	UTILITIES_ALLOCATION: "e.g. Tenant pays electricity; Landlord pays water",
	INSURANCE_AMOUNT: "e.g. $1,000,000 general liability per occurrence",
	DELIVERABLES_SCHEDULE: "e.g. Draft by Day 30; final report by Day 60",
	NON_SOLICIT_PERIOD: "e.g. twelve (12) months after termination",
	RECOGNITION_TERMS: "e.g. Name listed on the annual donor wall",
	REPORTING_TERMS: "e.g. Annual impact summary within 90 days of year-end",
	SPONSORSHIP_MODEL: "e.g. comprehensive (Model A) fiscal sponsorship",
	ADMIN_FEE_PERCENTAGE: "e.g. 7%",
	JOB_TITLE: "e.g. Program Manager",
	SUPERVISOR_TITLE: "e.g. Director of Operations",
	WORK_LOCATION: "e.g. Hybrid — HQ in Denver, 3 days on-site",
	WORK_SCHEDULE: "e.g. Monday–Friday, 9:00 a.m.–5:00 p.m. local time",
	EMPLOYMENT_TYPE_TERMS: "e.g. full-time, exempt, at-will employment",
	COMPENSATION_TYPE: "e.g. annual salary",
	PAY_FREQUENCY: "e.g. biweekly",
	BONUS_COMMISSION_TERMS: "e.g. discretionary annual bonus up to 10% of salary",
	HEALTH_BENEFITS_TERMS: "e.g. Company-sponsored medical, dental, and vision",
	PTO_TERMS: "e.g. 20 days PTO per year, accrued monthly",
	RETIREMENT_BENEFITS_TERMS: "e.g. 401(k) with 4% employer match",
	OTHER_BENEFITS_TERMS: "e.g. $75/month wellness stipend",
	PROBATIONARY_PERIOD_TERMS: "e.g. 90-day introductory period",
	PROBATION_LENGTH: "e.g. 90 days",
	NON_COMPETE_TERMS: "e.g. Limited non-compete in the same service line",
	NON_COMPETE_PERIOD: "e.g. six (6) months after employment ends",
	NON_COMPETE_SCOPE: "e.g. within 25 miles of the primary work location",
	SEVERANCE_TERMS:
		"e.g. two weeks’ pay per year of service, capped at 12 weeks",
	ADDITIONAL_FAR_CLAUSES: "Search and add FAR clauses (e.g. 52.212-4)",
};

const INTAKE_PLACEHOLDERS: Partial<Record<keyof WizardIntake, string>> = {
	contractName: "e.g. FY2026 Community Grant Agreement",
	counterparty: "e.g. Acme Health Services",
	department: "Select department",
	currency: "Select currency",
	amount: "e.g. 500000",
	governingLaw: "e.g. Delaware",
	description: "Optional internal notes about this draft…",
};

export function fillFieldPlaceholder(field: VisibleFillField): string {
	if (field.kind === "intake") {
		return (
			INTAKE_PLACEHOLDERS[field.intakeField] ||
			`Enter ${field.label.toLowerCase()}`
		);
	}
	if (TOKEN_PLACEHOLDERS[field.token]) {
		return TOKEN_PLACEHOLDERS[field.token];
	}
	if (field.dataType === "currency") {
		return "e.g. 500000";
	}
	if (field.dataType === "longtext") {
		return `Describe ${field.label.toLowerCase()} in plain language…`;
	}
	if (field.dataType === "date") {
		return `Select ${field.label.toLowerCase()}`;
	}
	if (field.token.endsWith("_TITLE")) {
		return "e.g. Executive Director";
	}
	if (field.token.endsWith("_NAME") || field.token.includes("SIGNEE_NAME")) {
		return "e.g. Jordan Lee";
	}
	return `Enter ${field.label.toLowerCase()}`;
}

export function parseAmountInput(raw: string): string {
	const cleaned = raw.replace(/[^0-9.]/g, "");
	if (!cleaned) return "";
	const dot = cleaned.indexOf(".");
	if (dot === -1) return cleaned;
	const whole = cleaned.slice(0, dot) || "0";
	const decimals = cleaned
		.slice(dot + 1)
		.replace(/\./g, "")
		.slice(0, 2);
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

export function formatAmountForDocument(raw: string, currency = "USD"): string {
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

const HEADING_KEYWORDS: Record<
	Exclude<TokenGroup, "signatures" | "record">,
	string[]
> = {
	parties: ["part", "parties"],
	dates: ["term", "duration", "period"],
	compensation: ["consideration", "payment", "compensation", "rent", "salary"],
	terms: ["scope", "statement of work", "services", "purpose", "duties"],
	legal: ["governing", "law", "far", "compliance"],
};

export function parseDocxHeadings(html: string): DocxHeading[] {
	return [
		...html.matchAll(/<p class="docx-heading"><strong>\s*(\d+)\.\s*([^<]+)/g),
	].map((match) => ({
		number: Number(match[1]),
		title: match[2].replace(/\.$/, "").trim(),
	}));
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

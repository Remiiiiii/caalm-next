import {
	OBLIGATION_KINDS,
	OBLIGATION_STATUSES,
	PURSUIT_SOURCES,
	PURSUIT_STAGES,
	type RetentionHealth,
} from "./types";

/** Alphanumeric Appwrite table IDs (name field holds human labels). */
export const FUNDING_TABLE_IDS = {
	pursuits: "69c4f201001a2b3c4d01",
	obligations: "69c4f202002b3c4d5e02",
} as const;

export const FUNDING_TABLE_NAMES = {
	pursuits: "funding_pursuits",
	obligations: "contract_obligations",
} as const;

/** Days-to-expiry bands used for retention health. */
export const RETENTION_WINDOWS = {
	criticalDays: 30,
	warningDays: 90,
} as const;

/** Visible-row budget for the retention list scroll pane (~8 rows). */
export const RETENTION_LIST_VISIBLE_ROWS = 8;

/** Fixed board height so left/right panels stay matched while the list scrolls. */
export const RETENTION_BOARD_HEIGHT_CLASS = "h-[42rem]";

export const RETENTION_HEALTH_LABEL: Record<RetentionHealth, string> = {
	at_risk: "At risk",
	protecting: "Protecting",
	protected: "Protected",
	expired: "Expired",
};

/** Stable demo departments when a contract has none on file (filter testing). */
export const RETENTION_DEMO_DEPARTMENTS = [
	"Child Welfare",
	"Behavioral Health",
	"CFS",
	"Residential",
	"Clinic",
	"Administration",
] as const;

export function seedRetentionDepartment(
	contractId: string,
	existing?: string | null,
): string {
	const trimmed = typeof existing === "string" ? existing.trim() : "";
	if (trimmed) return trimmed;
	let hash = 0;
	for (let i = 0; i < contractId.length; i++) {
		hash = (hash * 31 + contractId.charCodeAt(i)) >>> 0;
	}
	return RETENTION_DEMO_DEPARTMENTS[hash % RETENTION_DEMO_DEPARTMENTS.length];
}

/** List row expiry: "Expires 2027-05-12 · 240d" or "Expired 1d ago". */
export function formatRetentionExpiryLine(
	expiryDate: string | null,
	daysUntilExpiry: number | null,
): string {
	if (!expiryDate) return "No expiry on file";
	const date = expiryDate.slice(0, 10);
	if (daysUntilExpiry == null) return `Expires ${date}`;
	if (daysUntilExpiry < 0) {
		return `Expires ${date} · Expired ${Math.abs(daysUntilExpiry)}d ago`;
	}
	return `Expires ${date} · ${daysUntilExpiry}d`;
}

/** Banner phrase: "expires in 78 days". */
export function formatRetentionExpiryPhrase(
	daysUntilExpiry: number | null,
): string {
	if (daysUntilExpiry == null) return "no expiry on file";
	if (daysUntilExpiry < 0) {
		return `expired ${Math.abs(daysUntilExpiry)}d ago`;
	}
	if (daysUntilExpiry === 0) return "expires today";
	return `expires in ${daysUntilExpiry} days`;
}

export function isPursuitStage(
	value: unknown,
): value is (typeof PURSUIT_STAGES)[number] {
	return (
		typeof value === "string" &&
		(PURSUIT_STAGES as readonly string[]).includes(value)
	);
}

export function isPursuitSource(
	value: unknown,
): value is (typeof PURSUIT_SOURCES)[number] {
	return (
		typeof value === "string" &&
		(PURSUIT_SOURCES as readonly string[]).includes(value)
	);
}

export function isObligationStatus(
	value: unknown,
): value is (typeof OBLIGATION_STATUSES)[number] {
	return (
		typeof value === "string" &&
		(OBLIGATION_STATUSES as readonly string[]).includes(value)
	);
}

export function isObligationKind(
	value: unknown,
): value is (typeof OBLIGATION_KINDS)[number] {
	return (
		typeof value === "string" &&
		(OBLIGATION_KINDS as readonly string[]).includes(value)
	);
}

export function daysUntil(dateIso: string | null | undefined): number | null {
	if (!dateIso) return null;
	const raw = dateIso.split("T")[0];
	const [y, m, d] = raw.split("-").map(Number);
	if (!y || !m || !d) return null;
	const target = new Date(y, m - 1, d);
	target.setHours(0, 0, 0, 0);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return Math.floor((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Map expiry + obligation pressure → a plain-English health state.
 * at_risk = money could walk away soon without action.
 * protecting = work is underway (open renewal-linked obligations).
 * protected = far from expiry or renewal work complete.
 */
export function computeRetentionHealth(input: {
	daysUntilExpiry: number | null;
	openObligationCount: number;
	overdueObligationCount: number;
	lifecycleStatus?: string;
}): RetentionHealth {
	const life = (input.lifecycleStatus || "").toLowerCase();
	if (life === "expired" || life === "terminated") return "expired";
	if (input.daysUntilExpiry != null && input.daysUntilExpiry < 0) {
		return "expired";
	}

	if (input.overdueObligationCount > 0) return "at_risk";

	if (
		input.daysUntilExpiry != null &&
		input.daysUntilExpiry <= RETENTION_WINDOWS.criticalDays
	) {
		return input.openObligationCount > 0 ? "protecting" : "at_risk";
	}

	if (
		input.daysUntilExpiry != null &&
		input.daysUntilExpiry <= RETENTION_WINDOWS.warningDays
	) {
		return input.openObligationCount > 0 ? "protecting" : "at_risk";
	}

	if (input.openObligationCount > 0) return "protecting";
	return "protected";
}

export function formatUsd(amount: number, currency = "USD"): string {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).format(amount || 0);
	} catch {
		return `$${Math.round(amount || 0).toLocaleString("en-US")}`;
	}
}

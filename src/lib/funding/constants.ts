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

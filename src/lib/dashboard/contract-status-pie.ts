/**
 * Mutually exclusive Contract Status pie buckets.
 *
 * Always derive days-until-expiry from `contractExpiryDate` — the stored
 * `daysUntilExpiry` field goes stale and was counting past-due deals as
 * "Expiring" instead of "Expired".
 */

export type ContractStatusPieBucket = "active" | "expiring" | "expired";

export interface ContractStatusPieRow {
	status?: string | null;
	contractExpiryDate?: string | null;
	isExpired?: boolean | null;
	daysUntilExpiry?: number | null;
}

export interface ContractStatusPieSegment {
	status: ContractStatusPieBucket;
	count: number;
	percentage: number;
	color: string;
}

export interface ContractStatusPieResult {
	segments: ContractStatusPieSegment[];
	total: number;
	active: number;
	expiring: number;
	expired: number;
}

const COLORS: Record<ContractStatusPieBucket, string> = {
	active: "#10B981",
	expiring: "#F59E0B",
	expired: "#6B7280",
};

const EXPIRING_WINDOW_DAYS = 90;

/** Local calendar days from today to the expiry date (date-only, no TZ drift). */
export function daysUntilContractExpiry(
	expiryRaw: string | null | undefined,
	now = new Date(),
): number | null {
	if (!expiryRaw) return null;
	const expiryStr = String(expiryRaw).split("T")[0];
	const parts = expiryStr.split("-").map(Number);
	if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
	const [year, month, day] = parts;
	const expiry = new Date(year, month - 1, day);
	expiry.setHours(0, 0, 0, 0);
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	return Math.floor(
		(expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
	);
}

/**
 * One contract → one bucket (Expired > Expiring > Active).
 * Pending / other live statuses that are not near expiry sit in Active so the
 * three-segment widget still accounts for every row.
 */
export function classifyContractStatusPieBucket(
	row: ContractStatusPieRow,
	now = new Date(),
): ContractStatusPieBucket {
	const status = String(row.status || "")
		.trim()
		.toLowerCase();
	const days = daysUntilContractExpiry(row.contractExpiryDate, now);
	const pastExpiry = days !== null && days < 0;
	const flaggedExpired = row.isExpired === true;

	if (
		status === "expired" ||
		status === "inactive" ||
		flaggedExpired ||
		pastExpiry
	) {
		return "expired";
	}

	if (days !== null && days >= 0 && days <= EXPIRING_WINDOW_DAYS) {
		return "expiring";
	}

	return "active";
}

export function computeContractStatusPie(
	rows: ContractStatusPieRow[],
	now = new Date(),
): ContractStatusPieResult {
	let active = 0;
	let expiring = 0;
	let expired = 0;

	for (const row of rows) {
		const bucket = classifyContractStatusPieBucket(row, now);
		if (bucket === "expired") expired += 1;
		else if (bucket === "expiring") expiring += 1;
		else active += 1;
	}

	const total = rows.length;
	const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

	return {
		total,
		active,
		expiring,
		expired,
		segments: [
			{
				status: "active",
				count: active,
				percentage: pct(active),
				color: COLORS.active,
			},
			{
				status: "expiring",
				count: expiring,
				percentage: pct(expiring),
				color: COLORS.expiring,
			},
			{
				status: "expired",
				count: expired,
				percentage: pct(expired),
				color: COLORS.expired,
			},
		],
	};
}

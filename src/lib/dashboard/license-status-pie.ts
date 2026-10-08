/**
 * Mutually exclusive License Status pie buckets (Active / Expiring / Expired).
 * Derive from licenseExpiryDate — same rules as Contract Status.
 */

export type LicenseStatusPieBucket = "active" | "expiring" | "expired";

export interface LicenseStatusPieRow {
	status?: string | null;
	licenseExpiryDate?: string | null;
	expirationDate?: string | null;
	isExpired?: boolean | null;
	daysUntilExpiry?: number | null;
}

export interface LicenseStatusPieSegment {
	status: LicenseStatusPieBucket;
	count: number;
	percentage: number;
	color: string;
	[key: string]: unknown;
}

export interface LicenseStatusPieResult {
	segments: LicenseStatusPieSegment[];
	total: number;
	active: number;
	expiring: number;
	expired: number;
}

const COLORS: Record<LicenseStatusPieBucket, string> = {
	active: "#10B981",
	expiring: "#F59E0B",
	expired: "#6B7280",
};

const EXPIRING_WINDOW_DAYS = 90;

export function getLicensePieExpiryRaw(
	row: LicenseStatusPieRow,
): string | undefined {
	const raw = row.licenseExpiryDate || row.expirationDate;
	return raw ? String(raw) : undefined;
}

export function daysUntilLicensePieExpiry(
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

export function classifyLicenseStatusPieBucket(
	row: LicenseStatusPieRow,
	now = new Date(),
): LicenseStatusPieBucket {
	const status = String(row.status || "")
		.trim()
		.toLowerCase();
	const days = daysUntilLicensePieExpiry(getLicensePieExpiryRaw(row), now);
	const pastExpiry = days !== null && days < 0;
	const flaggedExpired = row.isExpired === true;

	if (
		status === "expired" ||
		status === "inactive" ||
		status === "suspended" ||
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

export function computeLicenseStatusPie(
	rows: LicenseStatusPieRow[],
	now = new Date(),
): LicenseStatusPieResult {
	let active = 0;
	let expiring = 0;
	let expired = 0;

	for (const row of rows) {
		const bucket = classifyLicenseStatusPieBucket(row, now);
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

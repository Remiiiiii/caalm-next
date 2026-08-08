/** Urgent cascade always included with notice-based alerts. */
export const DEFAULT_URGENT_THRESHOLDS = [15, 10, 5, 1] as const;

export const DEFAULT_NOTICE_DAYS = 30;

/**
 * Unique thresholds: record's renewalNoticeDays (or 30) + urgent cascade.
 */
export function getNoticeThresholds(
	renewalNoticeDays?: number | string | null,
): number[] {
	const parsed =
		renewalNoticeDays === null || renewalNoticeDays === undefined
			? DEFAULT_NOTICE_DAYS
			: typeof renewalNoticeDays === "string"
				? Number.parseInt(renewalNoticeDays, 10)
				: renewalNoticeDays;

	const notice =
		Number.isFinite(parsed) && parsed > 0
			? Math.floor(parsed)
			: DEFAULT_NOTICE_DAYS;

	const set = new Set<number>([notice, ...DEFAULT_URGENT_THRESHOLDS]);
	return Array.from(set).sort((a, b) => b - a);
}

export function shouldSendExpiryNotice(
	daysUntil: number,
	renewalNoticeDays?: number | string | null,
): boolean {
	if (!Number.isFinite(daysUntil) || daysUntil < 0) return false;
	return getNoticeThresholds(renewalNoticeDays).includes(daysUntil);
}

export type ExpiryNoticeMetadata = {
	entityType: "contract" | "license" | "audit";
	entityId: string;
	daysUntil: number;
};

export function buildExpiryNoticeMetadata(meta: ExpiryNoticeMetadata): string {
	return JSON.stringify(meta);
}

export function parseExpiryNoticeMetadata(
	raw?: string | null,
): ExpiryNoticeMetadata | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as ExpiryNoticeMetadata;
		if (
			(parsed.entityType === "contract" ||
				parsed.entityType === "license" ||
				parsed.entityType === "audit") &&
			typeof parsed.entityId === "string" &&
			typeof parsed.daysUntil === "number"
		) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

export function matchesExpiryNoticeMetadata(
	raw: string | null | undefined,
	expected: ExpiryNoticeMetadata,
): boolean {
	const parsed = parseExpiryNoticeMetadata(raw);
	if (!parsed) return false;
	return (
		parsed.entityType === expected.entityType &&
		parsed.entityId === expected.entityId &&
		parsed.daysUntil === expected.daysUntil
	);
}

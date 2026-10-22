import { cadencesDueNow } from "@/lib/timezone";
import type { AuditCadence } from "./types";

/** Hour (UTC) the readiness cron fires; keep in sync with the audit-readiness entry in vercel.json. */
export const READINESS_CRON_UTC_HOUR = 13;

/**
 * The next scheduled snapshot: the first future cron run whose org-local day is
 * a due day for some cadence (weekly Monday, monthly day 1, quarterly).
 */
export function nextScheduledReadinessRun(
	now: Date,
	timeZone: string,
): { at: string; cadences: AuditCadence[] } | null {
	for (let offset = 0; offset <= 100; offset += 1) {
		const candidate = new Date(
			Date.UTC(
				now.getUTCFullYear(),
				now.getUTCMonth(),
				now.getUTCDate() + offset,
				READINESS_CRON_UTC_HOUR,
			),
		);
		if (candidate.getTime() <= now.getTime()) continue;
		const due = cadencesDueNow(candidate, timeZone);
		if (due.length > 0) {
			return { at: candidate.toISOString(), cadences: due as AuditCadence[] };
		}
	}
	return null;
}

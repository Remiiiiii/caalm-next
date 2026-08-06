/**
 * Build human-readable action-completed payloads for the assistant UI.
 */

export type ActionCompletedPayload = {
	eyebrow?: string;
	headline: string;
	fields: Array<{ label: string; value: string }>;
};

function ymdPart(dateStr: string): string {
	if (!dateStr) return "";
	return dateStr.includes("T") ? dateStr.split("T")[0]! : dateStr.slice(0, 10);
}

export function formatActionDateLong(dateStr: string): string {
	const part = ymdPart(dateStr);
	const [y, m, d] = part.split("-").map(Number);
	if (!y || !m || !d) return dateStr;
	const date = new Date(y, m - 1, d);
	if (Number.isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function formatActionDateShort(dateStr: string): string {
	const part = ymdPart(dateStr);
	const [y, m, d] = part.split("-").map(Number);
	if (!y || !m || !d) return dateStr;
	const date = new Date(y, m - 1, d);
	if (Number.isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

export function formatActionTimeRange(
	startTime?: string,
	endTime?: string,
): string {
	const start = startTime?.trim() || "";
	const end = endTime?.trim() || "";
	if (start && end) return `${start} – ${end}`;
	return start || end || "Time TBD";
}

const HIDDEN_RESULT_KEYS = new Set([
	"eventId",
	"eventid",
	"$id",
	"id",
	"calendarHref",
	"pendingApproval",
	"note",
	"conflicts",
	"invitedCount",
]);

export function buildCalendarActionCompleted(params: {
	toolName: string;
	result: Record<string, unknown>;
}): ActionCompletedPayload | null {
	const title = String(params.result.title ?? "Meeting");
	const dateRaw = String(params.result.date ?? "");
	const startTime =
		typeof params.result.startTime === "string"
			? params.result.startTime
			: undefined;
	const endTime =
		typeof params.result.endTime === "string"
			? params.result.endTime
			: undefined;

	if (params.toolName === "reschedule_calendar_event") {
		const shortDate = dateRaw ? formatActionDateShort(dateRaw) : "the new time";
		return {
			eyebrow: "Action completed",
			headline: `Moved “${title}” to ${shortDate}`,
			fields: [
				{ label: "Title", value: title },
				...(dateRaw
					? [{ label: "Date", value: formatActionDateLong(dateRaw) }]
					: []),
				{
					label: "Time",
					value: formatActionTimeRange(startTime, endTime),
				},
			],
		};
	}

	if (params.toolName === "cancel_calendar_event") {
		return {
			eyebrow: "Action completed",
			headline: `Cancelled “${title}”`,
			fields: [{ label: "Title", value: title }],
		};
	}

	return null;
}

/** Fallback markdown summary without dumping ids / raw ISO timestamps. */
export function formatGenericSuccessSummary(
	label: string,
	result: unknown,
): string {
	if (result && typeof result === "object") {
		const entries = Object.entries(result as Record<string, unknown>)
			.filter(([key, value]) => {
				if (value === undefined || value === null) return false;
				if (HIDDEN_RESULT_KEYS.has(key) || HIDDEN_RESULT_KEYS.has(key.toLowerCase()))
					return false;
				if (Array.isArray(value) && value.length === 0) return false;
				return true;
			})
			.slice(0, 8)
			.map(([key, value]) => {
				const labelText = key
					.replace(/([A-Z])/g, " $1")
					.replace(/^./, (c) => c.toUpperCase())
					.trim();
				let display = String(value);
				if (key.toLowerCase().includes("date") && display.includes("T")) {
					display = formatActionDateLong(display);
				}
				return `- **${labelText}:** ${display}`;
			});
		if (entries.length) {
			return `Action completed: ${label}\n\n${entries.join("\n")}`;
		}
	}
	return `Action completed: ${label}`;
}

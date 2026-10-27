import {
	BUG_CONFIRM_IS_BUG,
	BUG_CONFIRM_SEARCHED,
	type ParsedBugReport,
	parseEngineeringBugDescription,
} from "./bug-report-body";
import type { Ticket } from "./ticket.types";

const LIST_MARKER = /^\s*(?:\d+[.)]|[-*])\s*/;

/**
 * Structured bug-report fields for the detail page. Prefers the stored columns
 * and falls back to parsing the description for tickets not backfilled yet.
 * Null for Help tickets, which stay plain text.
 */
export function getStructuredBody(
	ticket: Pick<
		Ticket,
		| "description"
		| "stepsToReproduce"
		| "expectedBehavior"
		| "actualBehavior"
		| "os"
		| "environment"
		| "confirmedNoDuplicate"
		| "confirmedProductBug"
	>,
): ParsedBugReport | null {
	const parsed = parseEngineeringBugDescription(ticket.description);
	if (!ticket.stepsToReproduce && !ticket.expectedBehavior) return parsed;

	return {
		steps: (ticket.stepsToReproduce ?? "")
			.split("\n")
			.map((line) => line.replace(LIST_MARKER, "").trim())
			.filter(Boolean),
		expected: ticket.expectedBehavior ?? "",
		actual: ticket.actualBehavior ?? "",
		os: ticket.os ?? "",
		environment: ticket.environment ?? "",
		extra: parsed?.extra ?? "",
		confirmations: [
			{
				label: BUG_CONFIRM_SEARCHED,
				checked: Boolean(ticket.confirmedNoDuplicate),
			},
			{
				label: BUG_CONFIRM_IS_BUG,
				checked: Boolean(ticket.confirmedProductBug),
			},
		],
	};
}

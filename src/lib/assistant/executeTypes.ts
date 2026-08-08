/** Flat calendar mutation payload from /api/assistant/execute. */
export type AssistantCalendarMutation = {
	kind: "create" | "update" | "remove";
	eventId?: string;
	title?: string;
	date?: string;
	startTime?: string;
	endTime?: string;
};

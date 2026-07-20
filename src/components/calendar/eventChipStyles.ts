export type CalendarSource = "my" | "holidays" | "shared" | "resource";

export interface EventChipStyle {
	/** Solid accent for left bar / legend swatch */
	accent: string;
	/** Pastel fill (~20% opacity feel) */
	fill: string;
	/** Hover fill */
	fillHover: string;
	text: string;
}

export const CALENDAR_SOURCE_STYLES: Record<CalendarSource, EventChipStyle> = {
	my: {
		accent: "#00c1cb",
		fill: "rgba(0, 193, 203, 0.18)",
		fillHover: "rgba(0, 193, 203, 0.28)",
		text: "#0f5384",
	},
	holidays: {
		accent: "#f97316",
		fill: "rgba(249, 115, 22, 0.18)",
		fillHover: "rgba(249, 115, 22, 0.28)",
		text: "#9a3412",
	},
	shared: {
		accent: "#0f5384",
		fill: "rgba(15, 83, 132, 0.15)",
		fillHover: "rgba(15, 83, 132, 0.25)",
		text: "#0f5384",
	},
	resource: {
		accent: "#9333ea",
		fill: "rgba(147, 51, 234, 0.15)",
		fillHover: "rgba(147, 51, 234, 0.25)",
		text: "#6b21a8",
	},
};

export const VISIBLE_CHIPS_PER_DAY = 3;

export function resolveCalendarSource(event: {
	$id?: string;
	id?: string;
	resourceId?: string;
	source?: CalendarSource;
}): CalendarSource {
	if (event.source) return event.source;
	if (event.resourceId) return "resource";
	const id = event.$id || event.id || "";
	if (id.startsWith("holiday-")) return "holidays";
	return "my";
}

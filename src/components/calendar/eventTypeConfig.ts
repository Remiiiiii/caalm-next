import { Clock, FileText, type LucideIcon, Users } from "lucide-react";
import type { LocalCalendarEventType } from "@/components/calendar/outlookStyleCalendarTypes";

export type EventTypeVisualConfig = {
	color: string;
	icon: LucideIcon;
	borderColor: string;
};

const EVENT_TYPE_CONFIGS: Record<string, EventTypeVisualConfig> = {
	"contract review": {
		color: "bg-blue text-blue border-blue",
		icon: FileText,
		borderColor: "border-blue",
	},
	contract: {
		color: "bg-blue-100 text-blue-800 border-blue-200",
		icon: FileText,
		borderColor: "border-blue",
	},
	"deadline discussion": {
		color: "bg-red-100 text-red-800 border-red-200",
		icon: Clock,
		borderColor: "border-red",
	},
	deadline: {
		color: "bg-red-100 text-red-800 border-red-200",
		icon: Clock,
		borderColor: "border-red",
	},
	meeting: {
		color: "bg-green-100 text-green-800 border-green-200",
		icon: Users,
		borderColor: "border-green",
	},
	"internal review": {
		color: "bg-yellow-100 text-yellow-800 border-yellow-200",
		icon: FileText,
		borderColor: "border-orange",
	},
	review: {
		color: "bg-yellow-100 text-yellow-800 border-yellow-200",
		icon: FileText,
		borderColor: "border-orange",
	},
	audit: {
		color: "bg-purple-100 text-purple-800 border-purple-200",
		icon: FileText,
		borderColor: "border-purple-500",
	},
};

export function getEventTypeConfig(
	type: LocalCalendarEventType | string,
): EventTypeVisualConfig {
	return EVENT_TYPE_CONFIGS[type] || EVENT_TYPE_CONFIGS.meeting;
}

export function getEventTypeBorderColor(type: string | undefined): string {
	if (!type) return "border-gray-400";
	const normalizedType = type.toLowerCase().trim();
	const config = getEventTypeConfig(normalizedType);
	return config.borderColor || "border-gray-400";
}

export type EventTypeLabel =
	| "Contract Review"
	| "Deadline Discussion"
	| "Meeting"
	| "Internal Review"
	| "Audit"
	| "";

/** Display-friendly label for event type (keeps full text like "Deadline Discussion"). */
export function getEventTypeLabel(t: string | undefined): EventTypeLabel {
	if (!t) return "";
	const v = t.toLowerCase().trim();
	if (v === "contract review" || v === "contract") return "Contract Review";
	if (v === "deadline discussion" || v === "deadline")
		return "Deadline Discussion";
	if (v === "internal review" || v === "review") return "Internal Review";
	if (v === "meeting") return "Meeting";
	return "Audit";
}

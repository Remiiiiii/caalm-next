import type { TicketSeverity } from "./ticket.types";

export const TICKET_CATEGORIES = [
	"Software / Application",
	"Hardware",
	"Access & Permissions",
	"Network & Connectivity",
	"Billing & Account",
	"Other",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_MODULES = [
	"Contract Workflows",
	"Document Generation",
	"Notifications",
	"Reporting & Analytics",
	"User Management",
	"Not sure",
] as const;

export type TicketModule = (typeof TICKET_MODULES)[number];

export const TICKET_IMPACT_LEVELS = [
	{ value: "low", label: "Just me" },
	{ value: "medium", label: "My team" },
	{ value: "high", label: "Whole department" },
	{ value: "critical", label: "Whole organization" },
] as const;

export const TICKET_URGENCY_LEVELS = [
	{ value: "low", label: "Can wait" },
	{ value: "medium", label: "This week" },
	{ value: "high", label: "Today" },
	{ value: "critical", label: "Right now" },
] as const;

export type TicketImpactUrgency = TicketSeverity;

const SEVERITY_MATRIX: Record<
	string,
	{ level: TicketSeverity; hours: number }
> = {
	"critical-critical": { level: "critical", hours: 1 },
	"critical-high": { level: "critical", hours: 4 },
	"high-critical": { level: "critical", hours: 4 },
	"high-high": { level: "high", hours: 8 },
	"critical-medium": { level: "high", hours: 8 },
	"medium-critical": { level: "high", hours: 8 },
	"high-medium": { level: "medium", hours: 24 },
	"medium-high": { level: "medium", hours: 24 },
	"medium-medium": { level: "medium", hours: 24 },
	"critical-low": { level: "medium", hours: 24 },
	"low-critical": { level: "medium", hours: 24 },
	"high-low": { level: "low", hours: 48 },
	"low-high": { level: "low", hours: 48 },
	"medium-low": { level: "low", hours: 48 },
	"low-medium": { level: "low", hours: 48 },
	"low-low": { level: "low", hours: 48 },
};

export function deriveSeverityFromMatrix(
	impact: TicketImpactUrgency,
	urgency: TicketImpactUrgency,
): { severity: TicketSeverity; responseSlaHours: number } {
	const derived = SEVERITY_MATRIX[`${impact}-${urgency}`];
	if (!derived) {
		throw new Error("Invalid impact and urgency combination");
	}
	return { severity: derived.level, responseSlaHours: derived.hours };
}

export function getImpactLabel(value: TicketImpactUrgency): string {
	return (
		TICKET_IMPACT_LEVELS.find((item) => item.value === value)?.label ?? value
	);
}

export function getUrgencyLabel(value: TicketImpactUrgency): string {
	return (
		TICKET_URGENCY_LEVELS.find((item) => item.value === value)?.label ?? value
	);
}

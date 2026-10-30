import type { TicketLane, TicketSeverity } from "./ticket.types";

export const TICKET_CATEGORIES = [
	"Software / Application",
	"Hardware",
	"Access & Permissions",
	"Network & Connectivity",
	"Billing & Account",
	"Other",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_LANE_OPTIONS: Array<{
	value: TicketLane;
	label: string;
	helper: string;
}> = [
	{
		value: "help",
		label: "I need help",
		helper: "I need access, a device, or a change",
	},
	{
		value: "engineering",
		label: "Something is broken",
		helper: "Something isn't working the way it should",
	},
];

export const HELP_TICKET_CATEGORIES: TicketCategory[] = [
	"Hardware",
	"Access & Permissions",
	"Network & Connectivity",
	"Billing & Account",
	"Other",
];

export const ENGINEERING_TICKET_CATEGORIES: TicketCategory[] = [
	"Software / Application",
];

export function categoriesForLane(lane: TicketLane): TicketCategory[] {
	return lane === "help"
		? HELP_TICKET_CATEGORIES
		: ENGINEERING_TICKET_CATEGORIES;
}

export function isCategoryAllowedForLane(
	lane: TicketLane,
	category: string,
): boolean {
	return categoriesForLane(lane).includes(category as TicketCategory);
}

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

const SEVERITY_ORDER: readonly TicketSeverity[] = [
	"low",
	"medium",
	"high",
	"critical",
];

// Business days count as 24h each; the label is what people see.
const SEVERITY_SLA: Record<
	TicketSeverity,
	{ hours: number; label: string; sev: string; title: string }
> = {
	low: { hours: 120, label: "5 business days", sev: "SEV-4", title: "Low" },
	medium: { hours: 24, label: "1 business day", sev: "SEV-3", title: "Medium" },
	high: { hours: 4, label: "4 hours", sev: "SEV-2", title: "High" },
	critical: { hours: 1, label: "1 hour", sev: "SEV-1", title: "Critical" },
};

// Impact sets the base tier; "Today" / "Right now" urgency bumps it one tier.
// Whole org is always critical.
export function deriveSeverityFromMatrix(
	impact: TicketImpactUrgency,
	urgency: TicketImpactUrgency,
): {
	severity: TicketSeverity;
	responseSlaHours: number;
	responseSlaLabel: string;
} {
	const tier = SEVERITY_ORDER.indexOf(impact);
	const urgencyTier = SEVERITY_ORDER.indexOf(urgency);
	if (tier < 0 || urgencyTier < 0) {
		throw new Error("Invalid impact and urgency combination");
	}
	const bump = urgencyTier >= 2 ? 1 : 0;
	const severity = SEVERITY_ORDER[Math.min(tier + bump, 3)];
	const sla = SEVERITY_SLA[severity];
	return {
		severity,
		responseSlaHours: sla.hours,
		responseSlaLabel: sla.label,
	};
}

/** Response SLA in hours for a severity (business days count as 24h). */
export function getSeveritySlaHours(severity: TicketSeverity): number {
	return SEVERITY_SLA[severity].hours;
}

/** Badge text, e.g. "High — SEV-2". */
export function getSeverityBadgeTitle(severity: TicketSeverity): string {
	const { title, sev } = SEVERITY_SLA[severity];
	return `${title} — ${sev}`;
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

import type { TicketModule } from "@/lib/tickets/ticket-intake.constants";

export type TicketRouteContext = {
	pageLabel: string;
	affectedModule: TicketModule;
};

const MODULE_BY_SEGMENT: Record<string, TicketModule> = {
	contracts: "Contract Workflows",
	licenses: "Not sure",
	calendar: "Not sure",
	audits: "Reporting & Analytics",
	uploads: "Document Generation",
	documents: "Document Generation",
	images: "Document Generation",
	media: "Document Generation",
	others: "Document Generation",
	"user-management": "User Management",
	team: "User Management",
	analytics: "Reporting & Analytics",
};

const LABEL_BY_SEGMENT: Record<string, string> = {
	contracts: "Contracts",
	licenses: "Licenses",
	calendar: "Calendar",
	audits: "Audits",
	uploads: "Files",
	documents: "Files",
	images: "Files",
	media: "Files",
	others: "Files",
	"user-management": "Team",
	team: "Team",
	analytics: "Reports & Analytics",
	dashboard: "Dashboard",
	tickets: "Tickets",
};

function titleCase(segment: string): string {
	return segment
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function resolveTicketContextFromPath(
	pathname: string | null | undefined,
): TicketRouteContext {
	const segments = String(pathname || "/")
		.split("/")
		.filter(Boolean);
	const primary = segments[0] ?? "dashboard";

	if (primary === "dashboard" && segments[1]) {
		const nested = segments[1];
		return {
			pageLabel: LABEL_BY_SEGMENT[nested] ?? titleCase(nested),
			affectedModule: MODULE_BY_SEGMENT[nested] ?? "Not sure",
		};
	}

	return {
		pageLabel: LABEL_BY_SEGMENT[primary] ?? titleCase(primary),
		affectedModule: MODULE_BY_SEGMENT[primary] ?? "Not sure",
	};
}

export function shouldHideReportIssueFab(
	pathname: string | null | undefined,
): boolean {
	const path = pathname || "";
	return path === "/tickets/new" || path.startsWith("/sign-in");
}

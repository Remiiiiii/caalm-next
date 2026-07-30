/** Maps sidebar section headers to stable `data-tour` ids. */
const SECTION_TOUR_IDS: Record<string, string> = {
	Dashboard: "nav-dashboard",
	Contracts: "nav-contracts",
	Licenses: "nav-licenses",
	Audits: "nav-audits",
	"Reports & Analytics": "nav-reports-analytics",
};

export function sectionTourId(header: string): string | undefined {
	return SECTION_TOUR_IDS[header];
}

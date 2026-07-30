export type DemoTip = {
	id: string;
	title: string;
	body: string;
	/** Pathname prefixes or exact matches that trigger this tip. */
	routeMatchers: (pathname: string) => boolean;
	targetSelector: string;
	/** Center on viewport instead of anchoring to the sidebar target. */
	position?: "anchor" | "center";
	ctaLabel?: string;
	ctaHref?: string;
	image?: string;
};

export const DEMO_TIPS: DemoTip[] = [
	{
		id: "demo-welcome",
		title: "Welcome to the CAALM demo",
		body: "This sandbox has seeded contracts, licenses, and compliance data. Use the sidebar to explore. Tip cards will point out key areas as you go.",
		routeMatchers: (pathname) =>
			pathname.startsWith("/dashboard/") &&
			!pathname.startsWith("/dashboard/it"),
		targetSelector: '[data-tour="nav-dashboard"]',
		position: "center",
		ctaLabel: "Got it",
		image: "/assets/demo/tour/welcome.webp",
	},
	{
		id: "demo-contracts",
		title: "Contracts are ready to explore",
		body: "Browse seeded grant and government agreements, or upload a sample PDF from the demo drop zone to see extraction and approvals.",
		routeMatchers: (pathname) =>
			pathname === "/contracts" || pathname.startsWith("/contracts/"),
		targetSelector: '[data-tour="nav-contracts"]',
		ctaLabel: "Explore contracts",
		ctaHref: "/contracts",
		image: "/assets/demo/tour/contracts.webp",
	},
	{
		id: "demo-licenses",
		title: "Licenses live here",
		body: "Open a license card or drop a sample residential license PDF to walk through upload and review in demo mode.",
		routeMatchers: (pathname) =>
			pathname === "/licenses" || pathname.startsWith("/licenses/"),
		targetSelector: '[data-tour="nav-licenses"]',
		ctaLabel: "Explore licenses",
		ctaHref: "/licenses",
		image: "/assets/demo/tour/licenses.webp",
	},
	{
		id: "demo-audits",
		title: "Audits & compliance",
		body: "Check Compliance Status for nonprofit KRIs tied to contracts and licenses, then open Audit Logs for activity across your org.",
		routeMatchers: (pathname) =>
			pathname === "/audits" || pathname.startsWith("/audits/"),
		targetSelector: '[data-tour="nav-audits"]',
		ctaLabel: "Open compliance",
		ctaHref: "/audits/status",
		image: "/assets/demo/tour/audits.webp",
	},
	{
		id: "demo-analytics",
		title: "Reports & Analytics",
		body: "Use Overview for organization, contracts, calendar, and compliance tabs. Quick View and department pages dig into the same seeded demo data.",
		routeMatchers: (pathname) =>
			pathname === "/analytics" || pathname.startsWith("/analytics/"),
		targetSelector: '[data-tour="nav-reports-analytics"]',
		ctaLabel: "Open analytics",
		ctaHref: "/analytics",
		image: "/assets/demo/tour/analytics.webp",
	},
];

export function getTipForPathname(
	pathname: string,
	seenIds: string[],
): DemoTip | null {
	const seen = new Set(seenIds);
	for (const tip of DEMO_TIPS) {
		if (seen.has(tip.id)) continue;
		if (tip.routeMatchers(pathname)) return tip;
	}
	return null;
}

export function getTipStep(tipId: string): { current: number; total: number } {
	const index = DEMO_TIPS.findIndex((tip) => tip.id === tipId);
	return {
		current: index >= 0 ? index + 1 : 1,
		total: DEMO_TIPS.length,
	};
}

export function getNextTip(tipId: string): DemoTip | null {
	const index = DEMO_TIPS.findIndex((tip) => tip.id === tipId);
	if (index < 0 || index >= DEMO_TIPS.length - 1) return null;
	return DEMO_TIPS[index + 1] ?? null;
}

export function getPreviousTip(tipId: string): DemoTip | null {
	const index = DEMO_TIPS.findIndex((tip) => tip.id === tipId);
	if (index <= 0) return null;
	return DEMO_TIPS[index - 1] ?? null;
}

/** Route to open when advancing the tour to this tip. */
export function getTipNavHref(tip: DemoTip): string {
	if (tip.ctaHref) return tip.ctaHref;
	switch (tip.id) {
		case "demo-welcome":
			return "/dashboard/organizationadmin";
		case "demo-contracts":
			return "/contracts";
		case "demo-licenses":
			return "/licenses";
		case "demo-audits":
			return "/audits/status";
		case "demo-analytics":
			return "/analytics";
		default:
			return "/dashboard/organizationadmin";
	}
}

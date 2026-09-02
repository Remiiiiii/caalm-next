/**
 * Search-field options for SAM.gov Advanced Resources.
 *
 * Organization names track Level-1 style federal entities that commonly appear
 * in SAM opportunities (`organizationName` filter). Sources:
 * - Treasury / CFO Act consolidation entities (Financial Report Appendix A)
 * - OMB A-11 Appendix C major independent agencies
 * - SAM.gov Federal Hierarchy (departments / independent agencies)
 *
 * Full live hierarchy is available via SAM FH Public API; this curated list is
 * used for optimistic client-side suggestions (no extra API key / round-trip).
 */

export const US_STATES = [
	{ code: "AL", name: "Alabama" },
	{ code: "AK", name: "Alaska" },
	{ code: "AZ", name: "Arizona" },
	{ code: "AR", name: "Arkansas" },
	{ code: "CA", name: "California" },
	{ code: "CO", name: "Colorado" },
	{ code: "CT", name: "Connecticut" },
	{ code: "DE", name: "Delaware" },
	{ code: "FL", name: "Florida" },
	{ code: "GA", name: "Georgia" },
	{ code: "HI", name: "Hawaii" },
	{ code: "ID", name: "Idaho" },
	{ code: "IL", name: "Illinois" },
	{ code: "IN", name: "Indiana" },
	{ code: "IA", name: "Iowa" },
	{ code: "KS", name: "Kansas" },
	{ code: "KY", name: "Kentucky" },
	{ code: "LA", name: "Louisiana" },
	{ code: "ME", name: "Maine" },
	{ code: "MD", name: "Maryland" },
	{ code: "MA", name: "Massachusetts" },
	{ code: "MI", name: "Michigan" },
	{ code: "MN", name: "Minnesota" },
	{ code: "MS", name: "Mississippi" },
	{ code: "MO", name: "Missouri" },
	{ code: "MT", name: "Montana" },
	{ code: "NE", name: "Nebraska" },
	{ code: "NV", name: "Nevada" },
	{ code: "NH", name: "New Hampshire" },
	{ code: "NJ", name: "New Jersey" },
	{ code: "NM", name: "New Mexico" },
	{ code: "NY", name: "New York" },
	{ code: "NC", name: "North Carolina" },
	{ code: "ND", name: "North Dakota" },
	{ code: "OH", name: "Ohio" },
	{ code: "OK", name: "Oklahoma" },
	{ code: "OR", name: "Oregon" },
	{ code: "PA", name: "Pennsylvania" },
	{ code: "RI", name: "Rhode Island" },
	{ code: "SC", name: "South Carolina" },
	{ code: "SD", name: "South Dakota" },
	{ code: "TN", name: "Tennessee" },
	{ code: "TX", name: "Texas" },
	{ code: "UT", name: "Utah" },
	{ code: "VT", name: "Vermont" },
	{ code: "VA", name: "Virginia" },
	{ code: "WA", name: "Washington" },
	{ code: "WV", name: "West Virginia" },
	{ code: "WI", name: "Wisconsin" },
	{ code: "WY", name: "Wyoming" },
] as const;

export type UsStateCode = (typeof US_STATES)[number]["code"];

export function getUsStateLabel(code?: string): string {
	if (!code) return "";
	const match = US_STATES.find((s) => s.code === code.toUpperCase());
	return match ? `${match.code} — ${match.name}` : code;
}

export interface SamFederalOrganization {
	/** Value sent to SAM `organizationName` */
	name: string;
	/** Short names / abbreviations for optimistic matching */
	aliases: string[];
}

/** Curated federal orgs for Organization autocomplete (cabinet + major independents). */
export const SAM_FEDERAL_ORGANIZATIONS: SamFederalOrganization[] = [
	// Cabinet departments (CFO Act)
	{
		name: "Department of Agriculture",
		aliases: ["usda", "agriculture", "ag"],
	},
	{ name: "Department of Commerce", aliases: ["doc", "commerce"] },
	{
		name: "Department of Defense",
		aliases: ["dod", "defense", "dept of defense", "military"],
	},
	{ name: "Department of Education", aliases: ["ed", "education", "doe ed"] },
	{ name: "Department of Energy", aliases: ["doe", "energy"] },
	{
		name: "Department of Health and Human Services",
		aliases: ["hhs", "health", "human services"],
	},
	{
		name: "Department of Homeland Security",
		aliases: ["dhs", "homeland", "homeland security"],
	},
	{
		name: "Department of Housing and Urban Development",
		aliases: ["hud", "housing"],
	},
	{ name: "Department of the Interior", aliases: ["doi", "interior"] },
	{ name: "Department of Justice", aliases: ["doj", "justice"] },
	{ name: "Department of Labor", aliases: ["dol", "labor"] },
	{ name: "Department of State", aliases: ["state department", "dos", "state dept"] },
	{
		name: "Department of Transportation",
		aliases: ["dot", "transportation"],
	},
	{ name: "Department of the Treasury", aliases: ["treasury", "us treasury"] },
	{
		name: "Department of Veterans Affairs",
		aliases: ["va", "veterans", "veterans affairs"],
	},

	// Major independent / CFO Act entities
	{
		name: "Environmental Protection Agency",
		aliases: ["epa", "environmental"],
	},
	{
		name: "General Services Administration",
		aliases: ["gsa", "general services"],
	},
	{
		name: "National Aeronautics and Space Administration",
		aliases: ["nasa", "space"],
	},
	{ name: "National Science Foundation", aliases: ["nsf", "science foundation"] },
	{
		name: "Office of Personnel Management",
		aliases: ["opm", "personnel"],
	},
	{
		name: "Small Business Administration",
		aliases: ["sba", "small business"],
	},
	{
		name: "Social Security Administration",
		aliases: ["ssa", "social security"],
	},
	{
		name: "U.S. Agency for International Development",
		aliases: ["usaid", "aid"],
	},
	{
		name: "Nuclear Regulatory Commission",
		aliases: ["nrc", "nuclear"],
	},
	{
		name: "Securities and Exchange Commission",
		aliases: ["sec", "securities"],
	},
	{
		name: "Federal Communications Commission",
		aliases: ["fcc", "communications"],
	},
	{ name: "Federal Trade Commission", aliases: ["ftc", "trade commission"] },
	{
		name: "National Archives and Records Administration",
		aliases: ["nara", "archives"],
	},
	{
		name: "Office of the Director of National Intelligence",
		aliases: ["odni", "dni", "intelligence"],
	},
	{ name: "Central Intelligence Agency", aliases: ["cia"] },
	{
		name: "National Security Agency",
		aliases: ["nsa"],
	},
	{
		name: "Defense Logistics Agency",
		aliases: ["dla", "logistics"],
	},
	{
		name: "Defense Health Agency",
		aliases: ["dha"],
	},
	{
		name: "U.S. Army Corps of Engineers",
		aliases: ["usace", "army corps", "corps of engineers"],
	},
	{
		name: "National Institutes of Health",
		aliases: ["nih"],
	},
	{
		name: "Centers for Disease Control and Prevention",
		aliases: ["cdc"],
	},
	{
		name: "Food and Drug Administration",
		aliases: ["fda"],
	},
	{
		name: "Federal Emergency Management Agency",
		aliases: ["fema"],
	},
	{
		name: "Transportation Security Administration",
		aliases: ["tsa"],
	},
	{
		name: "U.S. Customs and Border Protection",
		aliases: ["cbp", "customs"],
	},
	{
		name: "Internal Revenue Service",
		aliases: ["irs"],
	},
	{
		name: "National Park Service",
		aliases: ["nps", "park service"],
	},
	{
		name: "Forest Service",
		aliases: ["usfs", "forest"],
	},
	{
		name: "Bureau of Land Management",
		aliases: ["blm"],
	},
	{
		name: "Federal Aviation Administration",
		aliases: ["faa", "aviation"],
	},
	{
		name: "Veterans Health Administration",
		aliases: ["vha"],
	},
	{
		name: "United States Postal Service",
		aliases: ["usps", "postal service", "postal"],
	},
	{
		name: "Tennessee Valley Authority",
		aliases: ["tva"],
	},
	{
		name: "Smithsonian Institution",
		aliases: ["smithsonian"],
	},
	{
		name: "Library of Congress",
		aliases: ["loc", "congress library"],
	},
	{
		name: "Government Accountability Office",
		aliases: ["gao"],
	},
	{
		name: "Congressional Budget Office",
		aliases: ["cbo"],
	},
];

function normalizeOrgQuery(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Optimistic org suggestions: filter the curated list as the user types.
 * Returns up to `limit` matches by name or alias.
 */
export function filterSamOrganizations(
	query: string,
	limit = 8,
): SamFederalOrganization[] {
	const q = normalizeOrgQuery(query);
	if (!q) return SAM_FEDERAL_ORGANIZATIONS.slice(0, limit);

	const scored = SAM_FEDERAL_ORGANIZATIONS.map((org) => {
		const name = normalizeOrgQuery(org.name);
		const aliasHit = org.aliases.find((a) =>
			normalizeOrgQuery(a).includes(q),
		);
		let score = 0;
		if (name === q || org.aliases.some((a) => normalizeOrgQuery(a) === q)) {
			score = 100;
		} else if (name.startsWith(q) || aliasHit?.startsWith(q)) {
			score = 80;
		} else if (name.includes(q) || aliasHit) {
			score = 50;
		}
		return { org, score };
	})
		.filter((row) => row.score > 0)
		.sort((a, b) => b.score - a.score || a.org.name.localeCompare(b.org.name));

	return scored.slice(0, limit).map((row) => row.org);
}

/**
 * Common SAM.gov opportunity title/keyword phrases for optimistic autocomplete.
 * Drawn from frequent federal procurement categories (IT, facilities, medical,
 * professional services, logistics) rather than a live API.
 */
export const SAM_KEYWORD_SUGGESTIONS = [
	"information technology",
	"IT services",
	"cybersecurity",
	"cloud computing",
	"software development",
	"systems engineering",
	"help desk",
	"network infrastructure",
	"data analytics",
	"artificial intelligence",
	"machine learning",
	"telecommunications",
	"professional services",
	"management consulting",
	"program management",
	"training",
	"technical support",
	"engineering services",
	"architecture and engineering",
	"construction",
	"facilities maintenance",
	"janitorial",
	"grounds maintenance",
	"HVAC",
	"electrical services",
	"plumbing",
	"security services",
	"guard services",
	"logistics",
	"warehousing",
	"transportation",
	"fleet management",
	"vehicle maintenance",
	"medical supplies",
	"pharmaceutical",
	"laboratory services",
	"healthcare services",
	"environmental services",
	"hazardous waste",
	"research and development",
	"non-profit",
	"small business",
	"staffing",
	"administrative support",
	"financial management",
	"audit services",
	"legal services",
	"translation services",
	"food services",
	"catering",
	"furniture",
	"office supplies",
	"PPE",
	"personal protective equipment",
	"surveillance",
	"UAV",
	"drone",
	"satellite",
	"radio communications",
	"fire protection",
	"waste management",
	"water treatment",
	"energy efficiency",
	"solar",
	"renewable energy",
] as const;

export function filterSamKeywords(query: string, limit = 8): string[] {
	const q = normalizeOrgQuery(query);
	if (!q) return [...SAM_KEYWORD_SUGGESTIONS].slice(0, limit);

	const scored = SAM_KEYWORD_SUGGESTIONS.map((term) => {
		const t = normalizeOrgQuery(term);
		let score = 0;
		if (t === q) score = 100;
		else if (t.startsWith(q)) score = 80;
		else if (t.includes(q)) score = 50;
		else if (q.split(" ").every((part) => part && t.includes(part))) score = 40;
		return { term, score };
	})
		.filter((row) => row.score > 0)
		.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));

	return scored.slice(0, limit).map((row) => row.term);
}

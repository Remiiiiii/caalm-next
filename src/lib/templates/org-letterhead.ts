import type { Organization } from "@/lib/rbac/organizations";

export const ORG_LETTERHEAD_TOKENS = [
	"org_name",
	"org_address",
	"org_phone_number",
	"org_email",
	"org_website",
] as const;

export type OrgLetterheadToken = (typeof ORG_LETTERHEAD_TOKENS)[number];

export function isOrgLetterheadToken(token: string): boolean {
	return (ORG_LETTERHEAD_TOKENS as readonly string[]).includes(token);
}

function settingText(settings: Organization["settings"] | undefined, key: string): string {
	const value = settings?.[key];
	return typeof value === "string" ? value.trim() : "";
}

/** City, ST ZIP — standard US contract letterhead second address line. */
export function formatOrgCityStateZip(
	settings: Organization["settings"] | undefined,
): string {
	const city = settingText(settings, "city");
	const state = settingText(settings, "state");
	const zipcode = settingText(settings, "zipcode");
	const cityState = [city, state].filter(Boolean).join(", ");
	if (cityState && zipcode) return `${cityState} ${zipcode}`;
	return cityState || zipcode;
}

/** Street on line 1, city/state/ZIP on line 2 when both are available. */
export function formatOrgStreetAddress(
	settings: Organization["settings"] | undefined,
): string {
	const street = settingText(settings, "street");
	const cityLine = formatOrgCityStateZip(settings);
	if (street && cityLine) return `${street}\n${cityLine}`;
	if (street) return street;
	if (cityLine) return cityLine;
	return settingText(settings, "address");
}

export function formatOrgWebsite(url: string): string {
	let next = url.trim();
	if (!next) return "";
	next = next.replace(/^https?:\/\//i, "");
	return next.replace(/\/+$/, "");
}

/** Map the creator's org profile onto the letterhead placeholders in every blueprint. */
export function orgLetterheadValues(
	org: Pick<Organization, "name" | "domain" | "settings"> | null,
): Record<OrgLetterheadToken, string> {
	const settings = org?.settings;
	const website =
		settingText(settings, "websiteUrl") ||
		(org?.domain ? formatOrgWebsite(`https://${org.domain}`) : "");

	return {
		org_name: org?.name?.trim() || "",
		org_address: formatOrgStreetAddress(settings),
		org_phone_number: settingText(settings, "phone"),
		org_email:
			settingText(settings, "email") ||
			settingText(settings, "ownerEmail") ||
			"",
		org_website: formatOrgWebsite(website),
	};
}

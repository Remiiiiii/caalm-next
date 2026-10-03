/**
 * Helpers for sharing the public give page URL (copy, email, UTM, embed).
 * Pure functions — safe for client components.
 */

export type GiveShareUtm = {
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
};

export function getGivePageOrigin(): string {
	// Prefer the configured public origin so email/QR/embed links stay stable
	// even when an admin is on a preview host or localhost.
	const fromEnv = (
		process.env.NEXT_PUBLIC_APP_URL ||
		process.env.NEXT_PUBLIC_SITE_URL ||
		""
	).trim();
	if (fromEnv) return fromEnv.replace(/\/$/, "");
	if (typeof window !== "undefined" && window.location?.origin) {
		return window.location.origin.replace(/\/$/, "");
	}
	return "";
}

/** Absolute public give URL, optionally with UTM query params. */
export function buildGivePageShareUrl(
	giveSlug: string,
	utm?: GiveShareUtm,
): string {
	const slug = giveSlug.trim().replace(/^\/+|\/+$/g, "");
	const origin = getGivePageOrigin();
	const path = `/give/${encodeURIComponent(slug)}`;
	const base = origin ? `${origin}${path}` : path;
	if (!utm) return base;

	const params = new URLSearchParams();
	if (utm.utm_source?.trim()) params.set("utm_source", utm.utm_source.trim());
	if (utm.utm_medium?.trim()) params.set("utm_medium", utm.utm_medium.trim());
	if (utm.utm_campaign?.trim())
		params.set("utm_campaign", utm.utm_campaign.trim());
	const qs = params.toString();
	return qs ? `${base}?${qs}` : base;
}

export function buildGiveShareEmailSubject(orgName: string): string {
	const name = orgName.trim() || "our organization";
	return `Support ${name}`;
}

export function buildGiveShareEmailBody(
	orgName: string,
	shareUrl: string,
): string {
	const name = orgName.trim() || "our organization";
	return [
		`Hi,`,
		``,
		`Would you consider making a gift to ${name}? Your support helps us continue our work.`,
		``,
		`Give here:`,
		shareUrl,
		``,
		`Thank you,`,
	].join("\n");
}

export function buildMailtoGiveShareUrl(input: {
	to?: string;
	orgName: string;
	shareUrl: string;
}): string {
	const subject = encodeURIComponent(buildGiveShareEmailSubject(input.orgName));
	const body = encodeURIComponent(
		buildGiveShareEmailBody(input.orgName, input.shareUrl),
	);
	const to = (input.to || "").trim();
	const path = to
		? `mailto:${encodeURIComponent(to)}`
		: "mailto:";
	// mailto with empty to still works; some clients prefer mailto:?subject=
	if (!to) {
		return `mailto:?subject=${subject}&body=${body}`;
	}
	return `${path}?subject=${subject}&body=${body}`;
}

/** Simple iframe embed snippet for org websites. */
export function buildGivePageEmbedSnippet(shareUrl: string): string {
	const safe = shareUrl.replace(/"/g, "&quot;");
	return `<iframe src="${safe}" title="Give online" width="100%" height="720" style="border:0;border-radius:12px;max-width:480px;" loading="lazy"></iframe>`;
}

export function slugifyUtmCampaign(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
}

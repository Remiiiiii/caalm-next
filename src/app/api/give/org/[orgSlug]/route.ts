import { type NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { listDesignationsForOrg } from "@/lib/designations/repository";
import { publicDonationPageConfigCacheTag } from "@/lib/give/donation-page-config/cache-invalidation";
import { resolveOrganizationByGiveSlug } from "@/lib/give/org";
import { resolvePublicDonationConfigForOrg } from "@/lib/give/resolve-public-donation-config";
import { getOrgLogoUrlFromSettings } from "@/lib/organizations/org-logo";

type RouteContext = { params: Promise<{ orgSlug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const { orgSlug } = await context.params;
	const org = await resolveOrganizationByGiveSlug(orgSlug);
	if (!org) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}
	const designations = await listDesignationsForOrg(org.$id);
	const settings = org.settings ?? {};
	const taxEinRaw =
		(typeof settings.giveEin === "string" && settings.giveEin) ||
		(typeof settings.ein === "string" && settings.ein) ||
		(typeof settings.taxId === "string" && settings.taxId) ||
		"";
	const taxEin = taxEinRaw.trim() || null;

	const previewToken = request.nextUrl.searchParams.get("donationPreview");

	let donationPageConfig = null as Awaited<
		ReturnType<typeof resolvePublicDonationConfigForOrg>
	> | null;

	if (previewToken) {
		donationPageConfig = await resolvePublicDonationConfigForOrg(org.$id, {
			previewToken,
			fallbackEin: taxEin,
		});
	} else {
		const loadPublished = unstable_cache(
			async () =>
				resolvePublicDonationConfigForOrg(org.$id, { fallbackEin: taxEin }),
			[`give-org-config-${org.$id}`],
			{ tags: [publicDonationPageConfigCacheTag(org.$id)] },
		);
		try {
			donationPageConfig = await loadPublished();
		} catch (error) {
			console.error("[give/org GET] donation page config:", error);
		}
	}

	const configEin = donationPageConfig?.config.ein ?? taxEin;

	return NextResponse.json({
		orgId: org.$id,
		name: org.name,
		logoUrl: getOrgLogoUrlFromSettings(org.settings),
		taxEin: configEin,
		designations: designations.map((d) => ({
			id: d.$id,
			label: d.label,
		})),
		donationPageConfig: donationPageConfig?.config ?? null,
		configSource: donationPageConfig?.source ?? null,
	});
}

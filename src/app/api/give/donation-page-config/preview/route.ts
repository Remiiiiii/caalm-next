import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getDonationPageConfigService } from "@/lib/give/donation-page-config/runtime";
import { getOrganizationGiveSlug } from "@/lib/give/slug";
import { requireGiveOrgContext } from "@/lib/give/request-context";
import { getOrganization } from "@/lib/rbac/organizations";

export async function POST(request: NextRequest) {
	const ctx = await requireGiveOrgContext(
		request,
		PERMISSIONS.DONATIONS.CONFIG_EDIT,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const body = (await request.json().catch(() => ({}))) as {
			giveSlug?: string;
		};
		const service = getDonationPageConfigService();
		const token = service.createPreviewToken(ctx.orgId);

		// Prefer an explicit slug from the client; otherwise resolve from the org.
		let giveSlug = body.giveSlug?.trim() ?? "";
		if (!giveSlug) {
			const org = await getOrganization(ctx.orgId);
			if (!org) {
				return NextResponse.json(
					{ error: "Organization not found" },
					{ status: 404 },
				);
			}
			giveSlug = getOrganizationGiveSlug(org);
		}
		if (!giveSlug) {
			return NextResponse.json(
				{ error: "Organization give slug is not configured" },
				{ status: 400 },
			);
		}

		const origin =
			process.env.NEXT_PUBLIC_APP_URL ||
			process.env.NEXT_PUBLIC_SITE_URL ||
			"";
		const previewPath = `/give/${encodeURIComponent(giveSlug)}?donationPreview=${encodeURIComponent(token)}`;
		const previewUrl = origin
			? `${origin.replace(/\/$/, "")}${previewPath}`
			: previewPath;
		return NextResponse.json({ token, previewUrl, giveSlug });
	} catch (error) {
		console.error("[donation-page-config preview POST]", error);
		return NextResponse.json(
			{ error: "Failed to create preview" },
			{ status: 500 },
		);
	}
}

import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getDonationPageConfigService } from "@/lib/give/donation-page-config/runtime";
import { requireGiveOrgContext } from "@/lib/give/request-context";
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
		const origin =
			process.env.NEXT_PUBLIC_APP_URL ||
			process.env.NEXT_PUBLIC_SITE_URL ||
			"";
		let previewPath = `/give/preview?token=${encodeURIComponent(token)}`;
		if (body.giveSlug?.trim()) {
			previewPath = `/give/${encodeURIComponent(body.giveSlug.trim())}?donationPreview=${encodeURIComponent(token)}`;
		}
		const previewUrl = origin
			? `${origin.replace(/\/$/, "")}${previewPath}`
			: previewPath;
		return NextResponse.json({ token, previewUrl });
	} catch (error) {
		console.error("[donation-page-config preview POST]", error);
		return NextResponse.json({ error: "Failed to create preview" }, { status: 500 });
	}
}

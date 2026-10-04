import { type NextRequest, NextResponse } from "next/server";
import {
	hasShareAttribution,
	parseGiveShareAttribution,
} from "@/lib/give/attribution";
import { resolveOrganizationByGiveSlug } from "@/lib/give/org";
import {
	createDonationCheckoutSession,
	isDonationStripeConfigured,
} from "@/lib/stripe/donations";

export async function POST(request: NextRequest) {
	if (!isDonationStripeConfigured()) {
		return NextResponse.json(
			{ error: "Donation checkout is not configured" },
			{ status: 503 },
		);
	}

	try {
		const body = (await request.json()) as {
			orgSlug?: string;
			amountCents?: number;
			campaignId?: string;
			designationId?: string;
			programLabel?: string;
			interval?: "one_time" | "monthly";
			tributeType?: "honor" | "memory";
			tributeName?: string;
			shareSource?: string;
			shareMedium?: string;
			shareCampaign?: string;
			utm_source?: string;
			utm_medium?: string;
			utm_campaign?: string;
		};
		const orgSlug = body.orgSlug?.trim();
		if (!orgSlug) {
			return NextResponse.json({ error: "orgSlug is required" }, { status: 404 });
		}
		const org = await resolveOrganizationByGiveSlug(orgSlug);
		if (!org) {
			return NextResponse.json({ error: "Organization not found" }, { status: 404 });
		}

		const attribution = parseGiveShareAttribution(body);
		const amountCents = Number(body.amountCents ?? 0);
		const origin = request.nextUrl.origin;
		const session = await createDonationCheckoutSession({
			orgId: org.$id,
			orgName: org.name,
			amountCents,
			campaignId: body.campaignId,
			designationId: body.designationId?.trim() || undefined,
			programLabel: body.programLabel?.trim() || undefined,
			interval: body.interval === "monthly" ? "monthly" : "one_time",
			tributeType: body.tributeType,
			tributeName: body.tributeName?.trim() || undefined,
			...(hasShareAttribution(attribution) ? attribution : {}),
			successUrl: `${origin}/give/${encodeURIComponent(orgSlug)}?thanks=1`,
			cancelUrl: `${origin}/give/${encodeURIComponent(orgSlug)}?canceled=1`,
		});

		return NextResponse.json(session);
	} catch (error) {
		console.error("[give/checkout POST]", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Checkout failed" },
			{ status: 400 },
		);
	}
}

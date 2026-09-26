import { type NextRequest, NextResponse } from "next/server";
import {
	createDonationCheckoutSession,
	isDonationStripeConfigured,
} from "@/lib/stripe/donations";
import { resolveOrganizationByGiveSlug } from "@/lib/give/org";

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
		};
		const orgSlug = body.orgSlug?.trim();
		if (!orgSlug) {
			return NextResponse.json({ error: "orgSlug is required" }, { status: 404 });
		}
		const org = await resolveOrganizationByGiveSlug(orgSlug);
		if (!org) {
			return NextResponse.json({ error: "Organization not found" }, { status: 404 });
		}

		const amountCents = Number(body.amountCents ?? 0);
		const origin = request.nextUrl.origin;
		const session = await createDonationCheckoutSession({
			orgId: org.$id,
			orgName: org.name,
			amountCents,
			campaignId: body.campaignId,
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

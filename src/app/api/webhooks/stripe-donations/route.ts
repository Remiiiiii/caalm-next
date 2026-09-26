import { type NextRequest, NextResponse } from "next/server";
import {
	constructDonationWebhookEvent,
	handleDonationStripeWebhookEvent,
} from "@/lib/stripe/donation-webhooks";

export async function POST(request: NextRequest) {
	const signature = request.headers.get("stripe-signature");
	if (!signature) {
		return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
	}

	const payload = await request.text();
	try {
		const event = constructDonationWebhookEvent(payload, signature);
		const result = await handleDonationStripeWebhookEvent(event);
		return NextResponse.json(result);
	} catch (error) {
		console.error("[webhooks/stripe-donations]", error);
		return NextResponse.json({ error: "Webhook rejected" }, { status: 400 });
	}
}

import { type NextRequest, NextResponse } from "next/server";
import {
	constructWebhookEvent,
	handleStripeWebhookEvent,
} from "@/lib/stripe/webhooks";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const signature = request.headers.get("stripe-signature");
	if (!signature) {
		return NextResponse.json(
			{ error: "Missing stripe-signature" },
			{ status: 400 },
		);
	}

	const payload = await request.text();

	try {
		const event = constructWebhookEvent(payload, signature);
		await handleStripeWebhookEvent(event);
		return NextResponse.json({ received: true });
	} catch (error: any) {
		console.error("[billing/webhooks]", error);
		return NextResponse.json(
			{ error: error?.message || "Webhook error" },
			{ status: 400 },
		);
	}
}

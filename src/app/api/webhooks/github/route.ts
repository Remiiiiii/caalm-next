import { type NextRequest, NextResponse } from "next/server";
import { verifyGitHubWebhookSignature } from "@/lib/tickets/github-tickets.service";
import {
	claimGitHubDelivery,
	handleGitHubWebhookEvent,
} from "@/lib/tickets/github-webhook.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
	const signature = request.headers.get("x-hub-signature-256");
	const payload = await request.text();

	if (!verifyGitHubWebhookSignature(payload, signature, secret)) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	const deliveryId = request.headers.get("x-github-delivery") || "";
	if (deliveryId) {
		const claimed = await claimGitHubDelivery(deliveryId);
		if (!claimed) {
			return NextResponse.json({ received: true, duplicate: true });
		}
	}

	const eventName = request.headers.get("x-github-event") || "";
	try {
		const body = JSON.parse(payload) as Record<string, unknown>;
		const result = await handleGitHubWebhookEvent(eventName, body);
		return NextResponse.json({ received: true, ...result });
	} catch (error) {
		console.error("[webhooks/github]", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Webhook error" },
			{ status: 400 },
		);
	}
}

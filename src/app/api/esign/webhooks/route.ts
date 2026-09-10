import { type NextRequest, NextResponse } from "next/server";
import {
	handleNativeWebhook,
	verifyEsignWebhookSignature,
	type NativeWebhookPayload,
} from "@/lib/esign/webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const payload = await request.text();
	const signature = request.headers.get("x-esign-signature");
	if (!verifyEsignWebhookSignature(payload, signature)) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	try {
		const body = JSON.parse(payload) as NativeWebhookPayload;
		const result = await handleNativeWebhook(body);
		return NextResponse.json({ received: true, ...result });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Webhook error";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

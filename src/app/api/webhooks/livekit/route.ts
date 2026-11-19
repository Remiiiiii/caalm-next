import { type NextRequest, NextResponse } from "next/server";
import { finalizeVoiceInterview } from "@/lib/audit-lab/service";
import { verifyLiveKitWebhookEvent } from "@/lib/livekit/webhooks";

export async function POST(request: NextRequest) {
	const authHeader = request.headers.get("Authorization");
	const payload = await request.text();

	try {
		const event = await verifyLiveKitWebhookEvent(payload, authHeader);
		if (event.event === "room_finished" && event.room?.name) {
			await finalizeVoiceInterview(event.room.name);
		}
		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("[webhooks/livekit]", error);
		return NextResponse.json({ error: "Webhook rejected" }, { status: 400 });
	}
}

import { type NextRequest, NextResponse } from "next/server";
import {
	finalizeVoiceInterview,
	ingestVoiceEgressRecording,
} from "@/lib/audit-lab/service";
import { verifyLiveKitWebhookEvent } from "@/lib/livekit/webhooks";
import type { EgressInfo } from "livekit-server-sdk";

export async function POST(request: NextRequest) {
	const authHeader = request.headers.get("Authorization");
	const payload = await request.text();

	try {
		const event = await verifyLiveKitWebhookEvent(payload, authHeader);
		if (event.event === "room_finished" && event.room?.name) {
			await finalizeVoiceInterview(event.room.name);
		}
		if (
			(event.event === "egress_ended" || event.event === "egress_updated") &&
			event.egressInfo
		) {
			const info = event.egressInfo as EgressInfo;
			const status = String(info.status ?? "");
			const done =
				status.includes("COMPLETE") ||
				status === "EGRESS_COMPLETE" ||
				Number(info.status) === 2;
			if (done || event.event === "egress_ended") {
				await ingestVoiceEgressRecording(info);
			}
		}
		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("[webhooks/livekit]", error);
		return NextResponse.json({ error: "Webhook rejected" }, { status: 400 });
	}
}

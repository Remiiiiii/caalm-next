import {
	EgressClient,
	EncodedFileOutput,
	EncodedFileType,
	type EgressInfo,
} from "livekit-server-sdk";

function env(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name} env var for LiveKit`);
	return value;
}

function httpUrl(): string {
	return env("LIVEKIT_URL").replace(/^ws/, "http");
}

export function egressClient(): EgressClient {
	return new EgressClient(httpUrl(), env("LIVEKIT_API_KEY"), env("LIVEKIT_API_SECRET"));
}

/** Start a room composite recording (mp4) for a practice interview room. */
export async function startPracticeRoomEgress(roomName: string): Promise<EgressInfo> {
	const output = new EncodedFileOutput({
		fileType: EncodedFileType.MP4,
		filepath: `audit-lab/${roomName}/{time}`,
	});
	return egressClient().startRoomCompositeEgress(roomName, { file: output });
}

/** Best-effort download URL from a finished egress info payload. */
export function egressFileDownloadUrl(info: EgressInfo): string | null {
	const results = info.fileResults ?? [];
	for (const file of results) {
		const loc = (file as { location?: string; downloadUrl?: string }).location
			?? (file as { downloadUrl?: string }).downloadUrl;
		if (typeof loc === "string" && loc.length > 0) return loc;
	}
	return null;
}

export function attemptIdFromRoomName(roomName: string): string | null {
	if (!roomName.startsWith("review-attempt-")) return null;
	return roomName.slice("review-attempt-".length) || null;
}

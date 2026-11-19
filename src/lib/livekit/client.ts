import {
	AccessToken,
	AgentDispatchClient,
	RoomServiceClient,
} from "livekit-server-sdk";

/** Name the Node worker package registers itself under (see `worker/voice-agent`). */
export const VOICE_AGENT_NAME = "audit-lab-interviewer";

function env(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name} env var for LiveKit`);
	return value;
}

function httpUrl(): string {
	// livekit-server-sdk's server clients want http(s), not the browser's wss:// URL.
	return env("LIVEKIT_URL").replace(/^ws/, "http");
}

export function roomServiceClient(): RoomServiceClient {
	return new RoomServiceClient(
		httpUrl(),
		env("LIVEKIT_API_KEY"),
		env("LIVEKIT_API_SECRET"),
	);
}

export function agentDispatchClient(): AgentDispatchClient {
	return new AgentDispatchClient(
		httpUrl(),
		env("LIVEKIT_API_KEY"),
		env("LIVEKIT_API_SECRET"),
	);
}

/** Creates the room (if needed) and dispatches the interviewer agent into it, with the rubric as job metadata. */
export async function createVoiceInterviewRoom(params: {
	roomName: string;
	metadata: string;
}): Promise<void> {
	await roomServiceClient().createRoom({
		name: params.roomName,
		emptyTimeout: 5 * 60,
		maxParticipants: 2,
	});
	await agentDispatchClient().createDispatch(
		params.roomName,
		VOICE_AGENT_NAME,
		{
			metadata: params.metadata,
		},
	);
}

/** Short-lived token for the browser participant (mic-publish only — Phase 1 is voice-only). */
export async function createParticipantToken(params: {
	roomName: string;
	identity: string;
	name?: string;
}): Promise<string> {
	const token = new AccessToken(
		env("LIVEKIT_API_KEY"),
		env("LIVEKIT_API_SECRET"),
		{ identity: params.identity, name: params.name, ttl: "30m" },
	);
	token.addGrant({
		room: params.roomName,
		roomJoin: true,
		canPublish: true,
		canPublishData: true,
		canSubscribe: true,
	});
	return token.toJwt();
}

export function livekitBrowserUrl(): string {
	return env("LIVEKIT_URL");
}

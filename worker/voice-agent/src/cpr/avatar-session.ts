import { getJobContext, voice } from "@livekit/agents";
import {
	RoomEvent,
	TrackKind,
	type RemoteParticipant,
	type RemoteTrackPublication,
	type Room,
} from "@livekit/rtc-node";
import type { VideoGrant } from "livekit-server-sdk";
import { AccessToken } from "livekit-server-sdk";
import { CprAvatarError } from "./errors.js";
import { LocalAvatarRunner } from "./local-runner.js";
import {
	ATTRIBUTE_PUBLISH_ON_BEHALF,
	CPR_AVATAR_IDENTITY,
	CPR_AVATAR_NAME,
	DEFAULT_CPR_AVATAR_CONFIG,
	DEFAULT_JOIN_TIMEOUT_MS,
	TOKEN_TTL_SECONDS,
	type CprAvatarConfig,
} from "./types.js";

export type CprAvatarSessionOptions = {
	avatarId?: string;
	joinTimeoutMs?: number;
	avatarParticipantIdentity?: string;
	avatarParticipantName?: string;
	/** When set, POST { livekitUrl, livekitToken, avatarId } instead of in-process runner. */
	dispatchUrl?: string | null;
	config?: Partial<CprAvatarConfig>;
};

export type CprStartOptions = {
	livekitUrl?: string | null;
	livekitApiKey?: string | null;
	livekitApiSecret?: string | null;
};

/**
 * LiveKit Agents AvatarSession for CPR. Slice 1 starts an in-process
 * LocalAvatarRunner (LiveKit-adjacent). Later: dispatchUrl → GPU pool.
 */
export class AvatarSession extends voice.AvatarSession {
	private readonly avatarId: string;
	private readonly joinTimeoutMs: number;
	private readonly avatarParticipantIdentity: string;
	private readonly avatarParticipantName: string;
	private readonly dispatchUrl: string | null;
	private readonly config: CprAvatarConfig;

	private room?: Room;
	private agentSession?: voice.AgentSession;
	private audioOutput?: voice.DataStreamAudioOutput;
	private previousAudio: voice.AudioOutput | null = null;
	private runner: LocalAvatarRunner | null = null;
	private closePromise?: Promise<void>;

	constructor(options: CprAvatarSessionOptions = {}) {
		super();
		this.avatarId =
			options.avatarId?.trim() ||
			process.env.CPR_AVATAR_ID?.trim() ||
			DEFAULT_CPR_AVATAR_CONFIG.avatarId;
		this.joinTimeoutMs = options.joinTimeoutMs ?? DEFAULT_JOIN_TIMEOUT_MS;
		this.avatarParticipantIdentity =
			options.avatarParticipantIdentity ?? CPR_AVATAR_IDENTITY;
		this.avatarParticipantName =
			options.avatarParticipantName ?? CPR_AVATAR_NAME;
		this.dispatchUrl =
			options.dispatchUrl ?? process.env.CPR_AVATAR_DISPATCH_URL?.trim() ?? null;
		this.config = {
			...DEFAULT_CPR_AVATAR_CONFIG,
			...options.config,
			avatarId: this.avatarId,
		};
	}

	override get avatarIdentity(): string {
		return this.avatarParticipantIdentity;
	}

	override get provider(): string {
		return "cpr";
	}

	async start(
		agentSession: voice.AgentSession,
		room: Room,
		options: CprStartOptions = {},
	): Promise<void> {
		const livekitUrl = options.livekitUrl ?? process.env.LIVEKIT_URL;
		const livekitApiKey = options.livekitApiKey ?? process.env.LIVEKIT_API_KEY;
		const livekitApiSecret =
			options.livekitApiSecret ?? process.env.LIVEKIT_API_SECRET;
		if (!livekitUrl?.trim() || !livekitApiKey?.trim() || !livekitApiSecret?.trim()) {
			throw new CprAvatarError(
				"LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are required for CPR avatar",
			);
		}

		await super.start(agentSession, room);
		this.room = room;
		this.agentSession = agentSession;

		const agentIdentity = resolveAgentIdentity(room);
		const token = await mintAvatarToken({
			apiKey: livekitApiKey,
			apiSecret: livekitApiSecret,
			roomName: resolveRoomName(room),
			identity: this.avatarParticipantIdentity,
			name: this.avatarParticipantName,
			publishOnBehalf: agentIdentity,
		});
		const wsUrl = toWebSocketUrl(livekitUrl);

		if (this.dispatchUrl) {
			await dispatchRemoteWorker({
				dispatchUrl: this.dispatchUrl,
				livekitUrl: wsUrl,
				livekitToken: token,
				avatarId: this.avatarId,
			});
		} else {
			this.runner = new LocalAvatarRunner(this.config);
			await this.runner.start(wsUrl, token, agentIdentity);
		}

		this.previousAudio = agentSession.output.audio;
		this.audioOutput = new voice.DataStreamAudioOutput({
			room,
			destinationIdentity: this.avatarParticipantIdentity,
			waitRemoteTrack: TrackKind.KIND_VIDEO,
		});
		agentSession.output.audio = this.audioOutput;

		await this.waitForJoin({ timeout: this.joinTimeoutMs });

		room.on(RoomEvent.Disconnected, this.onRoomDisconnected);
		room.on(RoomEvent.TrackUnpublished, this.onTrackUnpublished);
		room.on(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
	}

	override async aclose(): Promise<void> {
		if (this.closePromise) {
			await this.closePromise.catch(() => undefined);
			return;
		}
		this.closePromise = this.closeImpl();
		return this.closePromise;
	}

	private async closeImpl(): Promise<void> {
		const room = this.room;
		if (room) {
			room.off(RoomEvent.Disconnected, this.onRoomDisconnected);
			room.off(RoomEvent.TrackUnpublished, this.onTrackUnpublished);
			room.off(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
		}
		this.releaseAudioOutput();
		if (this.runner) {
			await this.runner.close().catch((err) => {
				console.error("[cpr-avatar] runner close failed", err);
			});
			this.runner = null;
		}
		await super.aclose();
		this.room = undefined;
	}

	private releaseAudioOutput(): void {
		const audioOutput = this.audioOutput;
		const previous = this.previousAudio;
		const output = this.agentSession?.output;
		this.audioOutput = undefined;
		this.previousAudio = null;
		this.agentSession = undefined;
		if (!audioOutput) return;
		while (audioOutput.pendingPlayoutSegments > 0) {
			audioOutput.onPlaybackFinished({ playbackPosition: 0, interrupted: true });
		}
		if (output?.audio === audioOutput) output.audio = previous;
	}

	private onRoomDisconnected = () => {
		void this.aclose();
	};

	private onTrackUnpublished = (
		publication: RemoteTrackPublication,
		participant: RemoteParticipant,
	) => {
		if (
			participant.identity === this.avatarParticipantIdentity &&
			publication.kind === TrackKind.KIND_VIDEO
		) {
			console.warn("[cpr-avatar] avatar video unpublished; tearing down");
			void this.aclose();
		}
	};

	private onParticipantDisconnected = (participant: RemoteParticipant) => {
		if (participant.identity === this.avatarParticipantIdentity) {
			console.warn("[cpr-avatar] avatar left unexpectedly; tearing down");
			void this.aclose();
		}
	};
}

function resolveAgentIdentity(room: Room): string {
	const jobContext = getJobContext(false);
	const identity =
		jobContext?.agent?.identity ??
		room.localParticipant?.identity ??
		jobContext?.info.acceptArguments.identity;
	if (!identity?.trim()) {
		throw new CprAvatarError(
			"could not resolve agent identity; connect the room before starting CPR avatar",
		);
	}
	return identity;
}

function resolveRoomName(room: Room): string {
	const jobContext = getJobContext(false);
	const name = room.name || jobContext?.job.room?.name;
	if (!name?.trim()) {
		throw new CprAvatarError("could not resolve LiveKit room name for CPR avatar");
	}
	return name;
}

async function mintAvatarToken(opts: {
	apiKey: string;
	apiSecret: string;
	roomName: string;
	identity: string;
	name: string;
	publishOnBehalf: string;
}): Promise<string> {
	const token = new AccessToken(opts.apiKey, opts.apiSecret, {
		identity: opts.identity,
		name: opts.name,
		ttl: TOKEN_TTL_SECONDS,
	});
	token.kind = "agent";
	token.addGrant({
		roomJoin: true,
		room: opts.roomName,
		canPublish: true,
		canSubscribe: true,
		canPublishData: true,
	} as VideoGrant);
	token.attributes = {
		[ATTRIBUTE_PUBLISH_ON_BEHALF]: opts.publishOnBehalf,
		avatar: "true",
	};
	return token.toJwt();
}

async function dispatchRemoteWorker(opts: {
	dispatchUrl: string;
	livekitUrl: string;
	livekitToken: string;
	avatarId: string;
}): Promise<void> {
	const res = await fetch(opts.dispatchUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			livekitUrl: opts.livekitUrl,
			livekitToken: opts.livekitToken,
			avatarId: opts.avatarId,
		}),
		signal: AbortSignal.timeout(DEFAULT_JOIN_TIMEOUT_MS),
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new CprAvatarError(
			`CPR avatar dispatch failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
			{ type: "dispatch" },
		);
	}
}

function toWebSocketUrl(url: string): string {
	if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
	if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
	return url;
}

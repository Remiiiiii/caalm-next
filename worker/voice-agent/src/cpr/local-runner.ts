import {
	AudioFrame,
	AudioSource,
	LocalAudioTrack,
	LocalVideoTrack,
	Room,
	TrackPublishOptions,
	TrackSource,
	VideoBufferType,
	VideoFrame,
	VideoSource,
	type ByteStreamReader,
} from "@livekit/rtc-node";
import { CprAvatarError } from "./errors.js";
import { mouthOpenFromPcm, renderSpikeFrame } from "./spike-renderer.js";
import {
	CPR_AUDIO_STREAM_TOPIC,
	CPR_RPC_CLEAR_BUFFER,
	CPR_RPC_PLAYBACK_FINISHED,
	CPR_RPC_PLAYBACK_STARTED,
	type CprAvatarConfig,
	DEFAULT_CPR_AVATAR_CONFIG,
} from "./types.js";

/**
 * In-process avatar worker for slice 1: joins the interview room with a
 * minted token, receives `lk.audio_stream` PCM, republishes audio + spike
 * video. Replace the spike frame pump with a GPU VideoGenerator in slice 2
 * without changing AvatarSession's dispatch contract.
 */
export class LocalAvatarRunner {
	readonly room = new Room();
	private readonly config: CprAvatarConfig;
	private audioSource: AudioSource | null = null;
	private videoSource: VideoSource | null = null;
	private pumpTimer: ReturnType<typeof setInterval> | null = null;
	private mouthOpen = 0;
	private closed = false;
	private playbackPosition = 0;
	private audioPlaying = false;
	private agentIdentity: string | null = null;

	constructor(config: Partial<CprAvatarConfig> = {}) {
		this.config = { ...DEFAULT_CPR_AVATAR_CONFIG, ...config };
	}

	async start(
		livekitUrl: string,
		token: string,
		agentIdentity: string,
	): Promise<void> {
		if (this.closed) throw new CprAvatarError("LocalAvatarRunner is closed");
		this.agentIdentity = agentIdentity;

		this.room.registerByteStreamHandler(
			CPR_AUDIO_STREAM_TOPIC,
			(reader, participant) => {
				void this.onAudioStream(reader, participant.identity);
			},
		);

		await this.room.connect(livekitUrl, token);

		const lp = this.room.localParticipant;
		if (!lp) throw new CprAvatarError("avatar room has no local participant");

		lp.registerRpcMethod(CPR_RPC_CLEAR_BUFFER, async () => {
			this.mouthOpen = 0;
			if (this.audioPlaying) {
				this.audioPlaying = false;
				await this.notifyPlaybackFinished(agentIdentity, true);
				this.playbackPosition = 0;
			}
			return "ok";
		});

		await this.publishTracks();
		this.startIdlePump();
	}

	async close(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		if (this.pumpTimer) {
			clearInterval(this.pumpTimer);
			this.pumpTimer = null;
		}
		try {
			await this.audioSource?.close();
		} catch {
			/* ignore */
		}
		try {
			await this.videoSource?.close();
		} catch {
			/* ignore */
		}
		this.audioSource = null;
		this.videoSource = null;
		await this.room.disconnect();
	}

	private async publishTracks(): Promise<void> {
		const lp = this.room.localParticipant;
		if (!lp) throw new CprAvatarError("avatar room has no local participant");

		this.audioSource = new AudioSource(24000, 1);
		this.videoSource = new VideoSource(this.config.width, this.config.height);

		const audioTrack = LocalAudioTrack.createAudioTrack(
			"cpr_avatar_audio",
			this.audioSource,
		);
		const videoTrack = LocalVideoTrack.createVideoTrack(
			"cpr_avatar_video",
			this.videoSource,
		);

		await lp.publishTrack(
			audioTrack,
			new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }),
		);
		await lp.publishTrack(
			videoTrack,
			new TrackPublishOptions({ source: TrackSource.SOURCE_CAMERA }),
		);

		// First frame so waitForJoin sees a video publication immediately.
		this.captureVideoFrame(0);
	}

	private startIdlePump(): void {
		const intervalMs = Math.max(16, Math.floor(1000 / this.config.fps));
		this.pumpTimer = setInterval(() => {
			if (this.closed) return;
			// Decay mouth when silent so idle looks calm (Nuance-like rest).
			this.mouthOpen *= 0.85;
			this.captureVideoFrame(Date.now());
		}, intervalMs);
	}

	private captureVideoFrame(nowMs: number): void {
		if (!this.videoSource) return;
		const rgba = renderSpikeFrame({
			width: this.config.width,
			height: this.config.height,
			mouthOpen: this.mouthOpen,
			nowMs,
		});
		const frame = new VideoFrame(
			rgba,
			this.config.width,
			this.config.height,
			VideoBufferType.RGBA,
		);
		this.videoSource.captureFrame(frame);
	}

	private async onAudioStream(
		reader: ByteStreamReader,
		fromIdentity: string,
	): Promise<void> {
		const sampleRate = Number(reader.info.attributes?.sample_rate ?? "24000");
		const numChannels = Number(reader.info.attributes?.num_channels ?? "1");
		if (!this.audioPlaying) {
			this.audioPlaying = true;
			this.playbackPosition = 0;
			await this.notifyPlaybackStarted(fromIdentity);
		}

		try {
			for await (const chunk of reader) {
				if (this.closed) break;
				const pcm = new Int16Array(
					chunk.buffer,
					chunk.byteOffset,
					Math.floor(chunk.byteLength / 2),
				);
				this.mouthOpen = Math.max(this.mouthOpen, mouthOpenFromPcm(pcm));
				const frame = new AudioFrame(
					pcm,
					sampleRate,
					numChannels,
					Math.floor(pcm.length / numChannels),
				);
				await this.audioSource?.captureFrame(frame);
				this.playbackPosition += frame.samplesPerChannel / sampleRate;
			}
		} finally {
			if (this.audioPlaying) {
				this.audioPlaying = false;
				await this.notifyPlaybackFinished(fromIdentity, false);
				this.playbackPosition = 0;
			}
		}
	}

	private async notifyPlaybackStarted(agentIdentity: string): Promise<void> {
		const target = this.agentIdentity ?? agentIdentity;
		try {
			await this.room.localParticipant?.performRpc({
				destinationIdentity: target,
				method: CPR_RPC_PLAYBACK_STARTED,
				payload: JSON.stringify({}),
			});
		} catch (err) {
			console.warn("[cpr-avatar] playback_started rpc failed", err);
		}
	}

	private async notifyPlaybackFinished(
		agentIdentity: string,
		interrupted: boolean,
	): Promise<void> {
		const target = this.agentIdentity ?? agentIdentity;
		try {
			await this.room.localParticipant?.performRpc({
				destinationIdentity: target,
				method: CPR_RPC_PLAYBACK_FINISHED,
				payload: JSON.stringify({
					playback_position: this.playbackPosition,
					interrupted,
				}),
			});
		} catch (err) {
			console.warn("[cpr-avatar] playback_finished rpc failed", err);
		}
	}
}

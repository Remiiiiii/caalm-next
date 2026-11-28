/** CPR (CAALM Persona Runtime) shared constants. Keep free of Audit Lab domain types. */

export const CPR_AVATAR_IDENTITY = "cpr-avatar-worker";
export const CPR_AVATAR_NAME = "CAALM interviewer avatar";

/** LiveKit DataStream topic used by `@livekit/agents` DataStreamAudioOutput. */
export const CPR_AUDIO_STREAM_TOPIC = "lk.audio_stream";

export const CPR_RPC_CLEAR_BUFFER = "lk.clear_buffer";
export const CPR_RPC_PLAYBACK_FINISHED = "lk.playback_finished";
export const CPR_RPC_PLAYBACK_STARTED = "lk.playback_started";

export const ATTRIBUTE_PUBLISH_ON_BEHALF = "lk.publish_on_behalf";

/** Default interactive avatar id for the spike until the persona catalog lands. */
export const DEFAULT_CPR_AVATAR_ID = "cpr_spike_portrait_v1";

export const DEFAULT_JOIN_TIMEOUT_MS = 30_000;
export const TOKEN_TTL_SECONDS = 60 * 60;

export type CprAvatarBackend = "cpr" | "synthesia" | "none";

export type CprAvatarConfig = {
	avatarId: string;
	width: number;
	height: number;
	fps: number;
};

export const DEFAULT_CPR_AVATAR_CONFIG: CprAvatarConfig = {
	avatarId: DEFAULT_CPR_AVATAR_ID,
	width: 512,
	height: 512,
	fps: 15,
};

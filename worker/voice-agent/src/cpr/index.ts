export { AvatarSession } from "./avatar-session.js";
export type {
	CprAvatarSessionOptions,
	CprStartOptions,
} from "./avatar-session.js";
export { CprAvatarError } from "./errors.js";
export { LocalAvatarRunner } from "./local-runner.js";
export { selectAvatarBackend } from "./select-backend.js";
export {
	mouthOpenFromPcm,
	renderSpikeFrame,
} from "./spike-renderer.js";
export {
	CPR_AVATAR_IDENTITY,
	CPR_AVATAR_NAME,
	DEFAULT_CPR_AVATAR_CONFIG,
	DEFAULT_CPR_AVATAR_ID,
	type CprAvatarBackend,
	type CprAvatarConfig,
} from "./types.js";

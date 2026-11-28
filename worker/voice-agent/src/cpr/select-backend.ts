import type { CprAvatarBackend } from "./types.js";

/**
 * Picks which talking-head path the voice agent should try.
 * CPR wins when enabled (slice 1); otherwise fall back to Synthesia if keyed;
 * otherwise audio-only.
 */
export function selectAvatarBackend(env: NodeJS.ProcessEnv = process.env): {
	backend: CprAvatarBackend;
	reason: string;
} {
	const cprEnabled = env.CPR_AVATAR_ENABLED === "true";
	const cprDryRun = env.CPR_AVATAR_DRY_RUN === "true";
	const synthesiaDryRun = env.SYNTHESIA_DRY_RUN === "true";
	const synthesiaKey = env.SYNTHESIA_API_KEY?.trim();
	const synthesiaAvatarId = env.SYNTHESIA_AVATAR_ID?.trim();

	if (cprEnabled) {
		if (cprDryRun) {
			return {
				backend: "none",
				reason: "CPR_AVATAR_DRY_RUN=true; skipping avatar, audio-only",
			};
		}
		return {
			backend: "cpr",
			reason: "CPR_AVATAR_ENABLED=true",
		};
	}

	if (synthesiaDryRun) {
		return {
			backend: "none",
			reason: "SYNTHESIA_DRY_RUN=true; skipping Synthesia, audio-only",
		};
	}

	if (synthesiaKey && synthesiaAvatarId) {
		return {
			backend: "synthesia",
			reason: "Synthesia API key and avatar id present",
		};
	}

	return {
		backend: "none",
		reason: "No CPR or Synthesia avatar configured; audio-only",
	};
}

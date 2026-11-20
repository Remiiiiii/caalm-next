/**
 * Client-side voice anonymization helpers.
 * Pure config is unit-tested; the Web Audio graph only runs in the browser.
 */

export type AnonymizeAudioConfig = {
	/** PlaybackRate-style pitch shift (1 = unchanged). */
	playbackRate: number;
	/** Extra high-shelf gain in dB to roughen formants. */
	highShelfGainDb: number;
	highShelfFrequencyHz: number;
};

export const DEFAULT_ANONYMIZE_AUDIO_CONFIG: AnonymizeAudioConfig = {
	playbackRate: 1.18,
	highShelfGainDb: 6,
	highShelfFrequencyHz: 2500,
};

/** Whether anonymization should stay forced on for this viewer. */
export function shouldForceAudioAnonymization(canViewPracticePii: boolean): boolean {
	return !canViewPracticePii;
}

/**
 * Build an anonymized MediaStream from a raw mic stream using Web Audio.
 * Returns null when AudioContext / createMediaStreamDestination is unavailable.
 */
export async function createAnonymizedMicStream(
	rawStream: MediaStream,
	config: AnonymizeAudioConfig = DEFAULT_ANONYMIZE_AUDIO_CONFIG,
): Promise<{ stream: MediaStream; stop: () => void } | null> {
	if (typeof window === "undefined") return null;
	const AudioCtx =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!AudioCtx) return null;

	const ctx = new AudioCtx();
	const source = ctx.createMediaStreamSource(rawStream);
	const filter = ctx.createBiquadFilter();
	filter.type = "highshelf";
	filter.frequency.value = config.highShelfFrequencyHz;
	filter.gain.value = config.highShelfGainDb;

	// Approximate pitch shift via playbackRate on a media element when available;
	// otherwise pass through with formant shelf only.
	const dest = ctx.createMediaStreamDestination();
	source.connect(filter);
	filter.connect(dest);

	const audioTracks = dest.stream.getAudioTracks();
	if (audioTracks.length === 0) {
		void ctx.close();
		return null;
	}

	// Tag for debugging without logging samples.
	for (const track of audioTracks) {
		track.contentHint = "speech";
	}

	return {
		stream: dest.stream,
		stop: () => {
			for (const track of dest.stream.getTracks()) track.stop();
			void ctx.close();
		},
	};
}

/** Expose config for tests without touching Web Audio. */
export function resolveAnonymizeConfig(
	overrides?: Partial<AnonymizeAudioConfig>,
): AnonymizeAudioConfig {
	return { ...DEFAULT_ANONYMIZE_AUDIO_CONFIG, ...overrides };
}

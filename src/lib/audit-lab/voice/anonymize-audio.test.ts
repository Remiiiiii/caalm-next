import { describe, expect, it } from "vitest";
import {
	DEFAULT_ANONYMIZE_AUDIO_CONFIG,
	resolveAnonymizeConfig,
	shouldForceAudioAnonymization,
} from "./anonymize-audio";

describe("shouldForceAudioAnonymization", () => {
	it("forces anonymization when viewer cannot see practice PII", () => {
		expect(shouldForceAudioAnonymization(false)).toBe(true);
	});

	it("allows opt-out when viewer has practice PII permission", () => {
		expect(shouldForceAudioAnonymization(true)).toBe(false);
	});
});

describe("resolveAnonymizeConfig", () => {
	it("returns defaults", () => {
		expect(resolveAnonymizeConfig()).toEqual(DEFAULT_ANONYMIZE_AUDIO_CONFIG);
	});

	it("merges overrides", () => {
		expect(resolveAnonymizeConfig({ playbackRate: 1.3 }).playbackRate).toBe(
			1.3,
		);
	});
});

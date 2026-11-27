import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectAvatarBackend } from "./select-backend.js";

describe("selectAvatarBackend", () => {
	it("prefers CPR when enabled", () => {
		const result = selectAvatarBackend({
			CPR_AVATAR_ENABLED: "true",
			SYNTHESIA_API_KEY: "sk",
			SYNTHESIA_AVATAR_ID: "av_1",
		});
		assert.equal(result.backend, "cpr");
	});

	it("CPR dry-run yields audio-only", () => {
		const result = selectAvatarBackend({
			CPR_AVATAR_ENABLED: "true",
			CPR_AVATAR_DRY_RUN: "true",
		});
		assert.equal(result.backend, "none");
	});

	it("falls back to Synthesia when CPR off and keys present", () => {
		const result = selectAvatarBackend({
			SYNTHESIA_API_KEY: "sk",
			SYNTHESIA_AVATAR_ID: "av_1",
		});
		assert.equal(result.backend, "synthesia");
	});

	it("Synthesia dry-run yields audio-only", () => {
		const result = selectAvatarBackend({
			SYNTHESIA_DRY_RUN: "true",
			SYNTHESIA_API_KEY: "sk",
			SYNTHESIA_AVATAR_ID: "av_1",
		});
		assert.equal(result.backend, "none");
	});

	it("returns none when nothing configured", () => {
		const result = selectAvatarBackend({});
		assert.equal(result.backend, "none");
	});
});

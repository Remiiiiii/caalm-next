import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mouthOpenFromPcm, renderSpikeFrame } from "./spike-renderer.js";

describe("mouthOpenFromPcm", () => {
	it("returns 0 for silence", () => {
		assert.equal(mouthOpenFromPcm(new Int16Array(160)), 0);
	});

	it("returns a positive aperture for loud PCM", () => {
		const loud = new Int16Array(160);
		loud.fill(20000);
		assert.ok(mouthOpenFromPcm(loud) > 0.2);
	});
});

describe("renderSpikeFrame", () => {
	it("writes RGBA pixels for the requested size", () => {
		const width = 64;
		const height = 64;
		const buf = renderSpikeFrame({
			width,
			height,
			mouthOpen: 0.5,
			nowMs: 1000,
		});
		assert.equal(buf.length, width * height * 4);
		assert.equal(buf[3], 255);
	});
});

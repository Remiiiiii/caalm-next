import { describe, expect, it } from "vitest";
import { scanAttachmentFile } from "./scan";

describe("scanAttachmentFile", () => {
	it("passes a real PNG signature", async () => {
		const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const result = await scanAttachmentFile(png, "image/png");
		expect(result.ok).toBe(true);
	});

	it("fails a file whose bytes don't match its claimed mime type", async () => {
		// An .exe byte signature ("MZ...") saved/claimed as a PNG.
		const fakePng = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
		const result = await scanAttachmentFile(fakePng, "image/png");
		expect(result.ok).toBe(false);
		expect(result.reason).toBe("Failed compliance scan");
	});
});

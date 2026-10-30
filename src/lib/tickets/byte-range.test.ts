import { describe, expect, it } from "vitest";
import { parseByteRange } from "./byte-range";

describe("parseByteRange", () => {
	it("returns null without a usable header", () => {
		expect(parseByteRange(null, 100)).toBeNull();
		expect(parseByteRange("bytes=-", 100)).toBeNull();
		expect(parseByteRange("bytes=200-300", 100)).toBeNull();
		expect(parseByteRange("bytes=50-10", 100)).toBeNull();
	});

	it("parses start-end, open-ended and suffix ranges", () => {
		expect(parseByteRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
		expect(parseByteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
		expect(parseByteRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
		expect(parseByteRange("bytes=0-500", 100)).toEqual({ start: 0, end: 99 });
	});
});

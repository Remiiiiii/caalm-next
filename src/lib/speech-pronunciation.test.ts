import { describe, expect, it } from "vitest";
import { normalizeSpeechPronunciation } from "@/lib/speech-pronunciation";

describe("normalizeSpeechPronunciation", () => {
	it("expands Inc. and inc. to incorporated", () => {
		expect(normalizeSpeechPronunciation("Acme Inc. expires soon")).toBe(
			"Acme incorporated expires soon",
		);
		expect(normalizeSpeechPronunciation("Acme inc. expires soon")).toBe(
			"Acme incorporated expires soon",
		);
		expect(normalizeSpeechPronunciation("Acme Inc expires soon")).toBe(
			"Acme incorporated expires soon",
		);
	});

	it("expands Dept. and dept. to department", () => {
		expect(
			normalizeSpeechPronunciation("FL Dept. of Children and Families"),
		).toBe("FL department of Children and Families");
		expect(normalizeSpeechPronunciation("State dept. of Health")).toBe(
			"State department of Health",
		);
		expect(normalizeSpeechPronunciation("State Dept of Health")).toBe(
			"State department of Health",
		);
	});

	it("does not alter already-expanded words", () => {
		expect(
			normalizeSpeechPronunciation("The incorporated department office"),
		).toBe("The incorporated department office");
	});
});

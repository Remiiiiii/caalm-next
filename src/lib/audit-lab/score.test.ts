import { describe, expect, it } from "vitest";
import { applyPracticeScore } from "./score";

describe("applyPracticeScore", () => {
	it("keeps the given score for a normal answer", () => {
		expect(applyPracticeScore("We keep the binder in HR.", 2)).toEqual({
			score: 2,
			honestUnknown: false,
		});
	});

	it("treats an honest unknown as acceptable", () => {
		expect(applyPracticeScore("I don't know. I'll find out.", 1)).toEqual({
			score: 3,
			honestUnknown: true,
		});
	});
});

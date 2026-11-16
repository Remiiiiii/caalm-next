import { describe, expect, it } from "vitest";
import { applyPracticeScore } from "./score";

describe("applyPracticeScore", () => {
	it("keeps the given score for a normal answer", () => {
		const result = applyPracticeScore("We keep the binder in HR.", 2);
		expect(result.score).toBe(2);
		expect(result.honestUnknown).toBe(false);
		expect(result.dimensions.accuracy).toBeGreaterThan(0);
	});

	it("treats an honest unknown as acceptable", () => {
		const result = applyPracticeScore("I don't know. I'll find out.", 1);
		expect(result.score).toBe(3);
		expect(result.honestUnknown).toBe(true);
		expect(result.dimensions.honesty).toBe(100);
	});
});

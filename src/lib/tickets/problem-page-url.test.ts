import { describe, expect, it } from "vitest";
import {
	assertProblemPageUrl,
	defaultProblemPageUrl,
	parseProblemPageUrl,
} from "./problem-page-url";

const ORIGIN = "http://localhost:3000";

describe("problem-page-url", () => {
	it("accepts same-origin paths", () => {
		const result = parseProblemPageUrl("/my-contracts", ORIGIN);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.path).toBe("/my-contracts");
			expect(result.href).toBe(`${ORIGIN}/my-contracts`);
		}
	});

	it("rejects empty and sign-in", () => {
		expect(parseProblemPageUrl("", ORIGIN).ok).toBe(false);
		expect(parseProblemPageUrl("/sign-in", ORIGIN).ok).toBe(false);
	});

	it("rejects other origins", () => {
		expect(parseProblemPageUrl("https://evil.example.com/p", ORIGIN).ok).toBe(
			false,
		);
	});

	it("defaultProblemPageUrl builds href", () => {
		expect(defaultProblemPageUrl("/dashboard", ORIGIN)).toBe(
			`${ORIGIN}/dashboard`,
		);
	});

	it("assertProblemPageUrl throws on bad input", () => {
		expect(() => assertProblemPageUrl("", ORIGIN)).toThrow();
		expect(assertProblemPageUrl("/tickets/new", ORIGIN)).toBe(
			`${ORIGIN}/tickets/new`,
		);
	});
});

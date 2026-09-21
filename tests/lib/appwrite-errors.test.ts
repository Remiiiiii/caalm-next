import { describe, expect, it } from "vitest";
import {
	isAppwriteNotFoundError,
	isTransientAppwriteError,
} from "@/lib/appwrite/errors";

describe("isAppwriteNotFoundError", () => {
	it("treats Appwrite 404 / row_not_found as a real miss", () => {
		expect(isAppwriteNotFoundError({ code: 404 })).toBe(true);
		expect(isAppwriteNotFoundError({ type: "row_not_found" })).toBe(true);
		expect(isAppwriteNotFoundError({ type: "document_not_found" })).toBe(true);
	});

	it("does not treat a connect timeout as not found", () => {
		const error = new TypeError("fetch failed");
		(error as Error & { cause: { code: string } }).cause = {
			code: "UND_ERR_CONNECT_TIMEOUT",
		};
		expect(isAppwriteNotFoundError(error)).toBe(false);
	});
});

describe("isTransientAppwriteError", () => {
	it("detects undici connect timeouts", () => {
		const error = new TypeError("fetch failed");
		(error as Error & { cause: { code: string } }).cause = {
			code: "UND_ERR_CONNECT_TIMEOUT",
		};
		expect(isTransientAppwriteError(error)).toBe(true);
	});

	it("detects our lookup timeout", () => {
		const error = new Error("Operation timed out after 8000ms");
		error.name = "TimeoutError";
		expect(isTransientAppwriteError(error)).toBe(true);
	});
});

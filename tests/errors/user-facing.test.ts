import { describe, expect, it } from "vitest";
import {
	isTechnicalErrorMessage,
	toUserFacingErrorMessage,
} from "@/lib/errors/user-facing";

describe("toUserFacingErrorMessage", () => {
	it("keeps plain product messages", () => {
		expect(toUserFacingErrorMessage("You cannot claim this step")).toBe(
			"You cannot claim this step",
		);
	});

	it("hides Turbopack / module binding noise", () => {
		const raw =
			"(0 , __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$role$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__.isExecutiveRole) is not a function";
		expect(isTechnicalErrorMessage(raw)).toBe(true);
		expect(toUserFacingErrorMessage(raw, "Could not load workflow.")).toBe(
			"Could not load workflow.",
		);
	});

	it("hides TypeError / stack-like messages", () => {
		expect(
			toUserFacingErrorMessage(
				new Error("TypeError: Cannot read properties of undefined"),
				"Something went wrong.",
			),
		).toBe("Something went wrong.");
	});

	it("hides HTTP 500 / Request failed noise", () => {
		expect(
			toUserFacingErrorMessage(
				"Request failed (500 Internal Server Error)",
				"We couldn't send that invite. Try again. Nothing was saved twice.",
			),
		).toBe(
			"We couldn't send that invite. Try again. Nothing was saved twice.",
		);
	});

	it("hides raw Anthropic / JSON vendor payloads", () => {
		const raw =
			'404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-sonnet-4-5"},"request_id":"req_011CgtHWE6Fhi5bjJ7brQMHY"}';
		expect(isTechnicalErrorMessage(raw)).toBe(true);
		expect(
			toUserFacingErrorMessage(
				raw,
				"I couldn't complete that request. Please try again.",
			),
		).toBe("I couldn't complete that request. Please try again.");
	});
});

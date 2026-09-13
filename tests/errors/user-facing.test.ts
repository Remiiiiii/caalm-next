import { describe, expect, it } from "vitest";
import {
	isTechnicalErrorMessage,
	toUserFacingErrorMessage,
} from "@/lib/errors/user-facing";

describe("toUserFacingErrorMessage", () => {
	it("keeps plain product messages", () => {
		expect(
			toUserFacingErrorMessage("You cannot claim this step"),
		).toBe("You cannot claim this step");
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
});

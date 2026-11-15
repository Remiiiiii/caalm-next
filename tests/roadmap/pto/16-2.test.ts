import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 16.2 list_review_sessions tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/auditLabTools.ts"),
		"utf8",
	);

	it("registers list_review_sessions as read-only", () => {
		expect(source).toMatch(/name:\s*"list_review_sessions"/);
		expect(source).toContain("listReviewSessions(");
		expect(source).toContain("mutating: false");
	});
});

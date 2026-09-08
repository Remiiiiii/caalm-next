import { describe, expect, it } from "vitest";
import {
	applyRedline,
	buildComment,
} from "@/lib/contracts/negotiation/comments.logic";

describe("roadmap task 7.3 inline commenting/redlining", () => {
	it("round-trips a comment and applies a redline on the draft", () => {
		const text = "Payment is due in 30 days.";
		const phrase = "30 days";
		const start = text.indexOf(phrase);
		const store: ReturnType<typeof buildComment>[] = [];
		const created = buildComment({
			contractId: "c1",
			orgId: "org1",
			versionId: "v1",
			body: "Stretch payment terms",
			anchorStart: start,
			anchorEnd: start + phrase.length,
			redlineProposal: "45 days",
		});
		store.push(created);

		const loaded = store.find((row) => row.body === "Stretch payment terms");
		expect(loaded).toBeDefined();
		expect(loaded?.redlineProposal).toBe("45 days");
		expect(applyRedline(text, loaded!)).toBe("Payment is due in 45 days.");
	});

	it("rejects comments with no paragraph span", () => {
		expect(() =>
			buildComment({
				contractId: "c1",
				orgId: "org1",
				versionId: "v1",
				body: "Missing selection",
				anchorStart: 0,
				anchorEnd: 0,
			}),
		).toThrow(/Select a paragraph/);
	});

	it("rejects redlines that overwrite wizard-owned labels", () => {
		const text = `<!-- negotiation-snapshot:docx -->

# GRANT AGREEMENT

**Grantee:** Acme Health Services
`;
		const start = text.indexOf("**Grantee:**");
		expect(() =>
			applyRedline(text, {
				anchorStart: start,
				anchorEnd: start + "**Grantee:** Acme Health Services".length,
				redlineProposal: "Grantee: Acme Health Services Inc.",
			}),
		).toThrow(/cannot be redlined/);
	});
});

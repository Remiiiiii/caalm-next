import { describe, expect, it } from "vitest";
import {
	formatReadinessAssistantText,
	splitReadinessProse,
} from "@/lib/audits/readiness/format-assistant-text";

describe("formatReadinessAssistantText", () => {
	it("strips markdown markers and keeps readable paragraphs", () => {
		const formatted = formatReadinessAssistantText(
			"**Critical** gap in [Contracts](/contracts).\n\n## Next steps\n- Renew the license\n- Fix the contract",
		);
		expect(formatted).not.toMatch(/[*#`\[\]]/);
		expect(formatted).toContain("Critical gap in Contracts.");
		expect(formatted).not.toContain("(/contracts)");
		expect(formatted).toContain("• Renew the license");
		expect(formatted).toContain("• Fix the contract");
	});
});

describe("splitReadinessProse", () => {
	it("turns mixed intro + bullets into a paragraph then a list", () => {
		const blocks = splitReadinessProse(
			"Prioritize these gaps:\n- Renew the license\n- Fix the contract",
		);
		expect(blocks).toEqual([
			{ type: "paragraph", text: "Prioritize these gaps:" },
			{
				type: "list",
				ordered: false,
				items: ["Renew the license", "Fix the contract"],
			},
		]);
	});
});

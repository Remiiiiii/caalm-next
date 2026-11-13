import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 14.1 query_risk_averted tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/analyticsTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "query_risk_averted"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers query_risk_averted as read-only and gated on contracts.view", () => {
		expect(source).toMatch(/name:\s*"query_risk_averted"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("PERMISSIONS.CONTRACTS.VIEW");
	});

	it("wraps computeRiskImpact and surfaces honest data-source flags", () => {
		expect(toolBlock).toContain("computeRiskImpact(");
		expect(toolBlock).toContain("dataSources: snapshot.dataSources");
	});
});

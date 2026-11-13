import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 12.5 create_crm_draft_from_deal tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/integrationTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "create_crm_draft_from_deal"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers create_crm_draft_from_deal and is mutating", () => {
		expect(source).toMatch(/name:\s*"create_crm_draft_from_deal"/);
		expect(toolBlock).toMatch(/mutating:\s*true/);
	});

	it("wraps the existing src/lib/crm helpers, confirms, and audits", () => {
		expect(toolBlock).toContain("getCrmIntegration(ctx.orgId, provider)");
		expect(toolBlock).toContain("hubspotConnector.getDeal(");
		expect(toolBlock).toContain("createDraftFromCrmDeal(");
		expect(toolBlock).toContain("logAuditEvent(");
	});

	it("never fabricates a Salesforce deal; respects CRM entitlements", () => {
		expect(toolBlock).toContain("salesforceConnector.getDeal(");
		expect(toolBlock).toContain("PERMISSIONS.SETTINGS.INTEGRATIONS");
		expect(toolBlock).toContain("PERMISSIONS.CONTRACTS.CREATE");
	});
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 12.3 check_integration_status tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/integrationTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "check_integration_status"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers check_integration_status and is read-only, gated by settings.integrations", () => {
		expect(source).toMatch(/name:\s*"check_integration_status"/);
		expect(toolBlock).toMatch(/mutating:\s*false/);
		expect(toolBlock).toContain("PERMISSIONS.SETTINGS.INTEGRATIONS");
	});

	it("reports Gmail, Outlook mail, Outlook calendar, and CRM status, scoped to the caller/org", () => {
		expect(toolBlock).toContain("getGmailIntegrationStatus(ctx.user.$id)");
		expect(toolBlock).toContain(
			"getOutlookMailIntegrationStatus(ctx.user.$id)",
		);
		expect(toolBlock).toContain(
			'getCalendarIntegrationStatus(ctx.user.$id, "microsoft")',
		);
		expect(toolBlock).toContain('getCrmIntegration(ctx.orgId, "hubspot")');
		expect(toolBlock).toContain('getCrmIntegration(ctx.orgId, "salesforce")');
	});
});

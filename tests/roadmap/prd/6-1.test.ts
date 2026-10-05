import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PRD 6.1 integrations panel matches reality", () => {
	it("SSO and API cards use coming_soon — never a fake Connected state", () => {
		const panel = readFileSync(
			join(process.cwd(), "src/components/settings/IntegrationsPanel.tsx"),
			"utf8",
		);
		expect(panel).toMatch(/key="sso"/);
		expect(panel).toMatch(/status=\{hasSso \? "coming_soon" : "locked"\}/);
		expect(panel).toMatch(/key="api-webhooks"/);
		expect(panel).toMatch(
			/status=\{hasApiAccess \? "coming_soon" : "locked"\}/,
		);
		expect(panel).not.toMatch(/title="SSO[\s\S]*status="connected"/);
		expect(panel).toMatch(/onContactSales=\{hasSso \? goContactSales : undefined\}/);
		expect(panel).toMatch(/onConnect=\{hasSso \? undefined : onViewPlans\}/);
	});

	it("links Platform Readiness and CLM roadmaps from enterprise cards", () => {
		const panel = readFileSync(
			join(process.cwd(), "src/components/settings/IntegrationsPanel.tsx"),
			"utf8",
		);
		expect(panel).toMatch(/platform-readiness-roadmap/);
		expect(panel).toMatch(/clm-roadmap/);
		expect(panel).toMatch(/request-a-demo/);
	});

	it("IntegrationCard supports coming soon and contact sales", () => {
		const card = readFileSync(
			join(process.cwd(), "src/components/settings/IntegrationCard.tsx"),
			"utf8",
		);
		expect(card).toMatch(/coming_soon/);
		expect(card).toMatch(/Coming soon/);
		expect(card).toMatch(/onContactSales/);
	});
});

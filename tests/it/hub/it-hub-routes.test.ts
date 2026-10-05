import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toFleetRow, type OrgITSnapshot } from "@/lib/it/org-it-snapshot.types";

describe("IT hub routes and snapshot mapping", () => {
	it("overview and select-org use requireITHubOrgContext", () => {
		const overview = readFileSync(
			join(process.cwd(), "src/app/api/it/hub/overview/route.ts"),
			"utf8",
		);
		const select = readFileSync(
			join(process.cwd(), "src/app/api/it/hub/select-org/route.ts"),
			"utf8",
		);
		expect(overview).toMatch(/requireITHubOrgContext/);
		expect(overview).toMatch(/VIEW_MONITORING/);
		expect(select).toMatch(/requireITHubOrgContext/);
	});

	it("fleet uses requireITHubFleetContext (view_all_orgs + monitoring)", () => {
		const fleet = readFileSync(
			join(process.cwd(), "src/app/api/it/hub/fleet/route.ts"),
			"utf8",
		);
		expect(fleet).toMatch(/requireITHubFleetContext/);
		expect(fleet).not.toMatch(/role\s*===\s*['"]Super Admin['"]/);
	});

	it("cross-org reads write an audit event", () => {
		const helper = readFileSync(
			join(process.cwd(), "src/lib/it/require-it-hub-org.ts"),
			"utf8",
		);
		expect(helper).toMatch(/logAuditEvent/);
		expect(helper).toMatch(/hubAccess:\s*true/);
		expect(helper).toMatch(/VIEW_ALL_ORGS/);
	});

	it("maps a snapshot to a fleet row without inventing host metrics", () => {
		const snapshot: OrgITSnapshot = {
			orgId: "org_a",
			name: "Acme",
			status: "active",
			tier: "growth",
			billingStatus: "active",
			deletionScheduledAt: null,
			users: { used: 4, limit: 25 },
			twoFactor: { enabled: 2, total: 4 },
			storage: { usedBytes: 1024, limitBytes: 10_000 },
			contracts: { used: 3, limit: 100 },
			licenses: { used: 1, limit: 50 },
			tickets: { open: 2, criticalOpen: 1, recent: [] },
			audit: { recent: [] },
			integrations: { hubspotStatus: null },
			notices: ["Host CPU and request telemetry are not configured for this tenant."],
		};
		expect(toFleetRow(snapshot)).toMatchObject({
			orgId: "org_a",
			name: "Acme",
			openTickets: 2,
			criticalOpen: 1,
			usersUsed: 4,
		});
		expect(JSON.stringify(snapshot)).not.toMatch(/cpuUsage/);
	});

	it("IT nav lists Tenants behind platform.view_all_orgs", () => {
		const nav = readFileSync(
			join(process.cwd(), "src/constants/it-navigation.ts"),
			"utf8",
		);
		expect(nav).toMatch(/\/dashboard\/it\/tenants/);
		expect(nav).toMatch(/PLATFORM\.VIEW_ALL_ORGS/);
	});
});

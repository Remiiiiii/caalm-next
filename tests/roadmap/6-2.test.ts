import { describe, expect, it } from "vitest";
import { mapDealToDraftPayload } from "@/lib/crm/create-draft-from-deal";
import { canAccessCrmProvider } from "@/lib/crm/entitlements";
import type { CrmDealSnapshot } from "@/lib/crm/types";

describe("roadmap 6.2 HubSpot connector", () => {
	it("creates a populated draft payload when a deal hits the trigger stage", () => {
		const deal: CrmDealSnapshot = {
			provider: "hubspot",
			externalId: "hs_deal_88",
			name: "Northwind Services Agreement",
			amount: 42000,
			currency: "USD",
			companyName: "Northwind",
			ownerName: "Sam Rivera",
			stageId: "contractsent",
			pipelineId: "default",
			closeDate: "2026-11-15",
			raw: { dealstage: "contractsent" },
		};

		const payload = mapDealToDraftPayload({
			deal,
			orgId: "org_growth",
			ownerId: "user_owner",
		});

		expect(canAccessCrmProvider("growth", "hubspot")).toBe(true);
		expect(payload.lifecycleStatus).toBe("draft");
		expect(payload.contractName).toBe("Northwind Services Agreement");
		expect(payload.amount).toBe(42000);
		expect(payload.vendor).toBe("Northwind");
		expect(payload.crmReference).toBe("hubspot:hs_deal_88");
		expect(payload.description).toContain("hubspot:hs_deal_88");
	});
});

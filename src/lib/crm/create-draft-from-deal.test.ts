import { describe, expect, it, vi } from "vitest";
import { mapDealToDraftPayload } from "./create-draft-from-deal";
import type { CrmDealSnapshot } from "./types";
import { crmReferenceFor } from "./types";

vi.mock("./origin-links.repository", () => ({
	findOriginLink: vi.fn(),
	createOriginLink: vi.fn(),
}));
vi.mock("@/lib/billing/planLimits", () => ({
	assertCanCreateContract: vi.fn(),
}));
vi.mock("@/lib/appwrite", () => ({
	createAdminClient: vi.fn(),
}));

import { assertCanCreateContract } from "@/lib/billing/planLimits";
import { createDraftFromCrmDeal } from "./create-draft-from-deal";
import { createOriginLink, findOriginLink } from "./origin-links.repository";

const deal: CrmDealSnapshot = {
	provider: "hubspot",
	externalId: "12345",
	name: "Acme MSA",
	amount: 75000,
	currency: "USD",
	companyName: "Acme Corp",
	ownerName: "Pat Lee",
	stageId: "contractsent",
	pipelineId: "default",
	closeDate: "2026-10-01",
	raw: { dealname: "Acme MSA" },
};

describe("mapDealToDraftPayload", () => {
	it("maps HubSpot deal fields onto a draft contract payload", () => {
		const payload = mapDealToDraftPayload({
			deal,
			orgId: "org_1",
			ownerId: "user_1",
		});
		expect(payload.contractName).toBe("Acme MSA");
		expect(payload.orgId).toBe("org_1");
		expect(payload.amount).toBe(75000);
		expect(payload.lifecycleStatus).toBe("draft");
		expect(payload.status).toBe("pending-review");
		expect(payload.vendor).toBe("Acme Corp");
		expect(payload.priority).toBe("High");
		expect(payload.crmReference).toBe("hubspot:12345");
		expect(payload.description).toContain("HubSpot");
		expect(payload.description).toContain("Acme Corp");
		expect(payload.contractExpiryDate).toBe(
			new Date("2026-10-01").toISOString(),
		);
		expect(payload.contractNumber).toBe("HS-12345");
		expect(payload.contractType).toBe("Other");
		expect(payload.department).toBe("Sales");
		expect(payload.amount).toBe(75000);
	});

	it("resolves HubSpot millisecond close dates to ISO expiry", () => {
		const ms = String(Date.UTC(2026, 8, 30, 12, 0, 0));
		const payload = mapDealToDraftPayload({
			deal: { ...deal, closeDate: ms },
			orgId: "org_1",
			ownerId: "user_1",
		});
		expect(payload.contractExpiryDate).toBe(new Date(Number(ms)).toISOString());
	});

	it("falls back when close date is missing", () => {
		const payload = mapDealToDraftPayload({
			deal: { ...deal, closeDate: null },
			orgId: "org_1",
			ownerId: "user_1",
		});
		expect(payload.contractExpiryDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(new Date(payload.contractExpiryDate).getTime()).toBeGreaterThan(
			Date.now(),
		);
	});

	it("lands custom-mapped CRM fields on draft metadata", () => {
		const mappedDeal: CrmDealSnapshot = {
			...deal,
			externalId: "mapped-1",
			name: "Custom Title Deal",
			amount: 42000,
			companyName: "Mapped Vendor LLC",
			ownerName: "Alex Rivera",
			closeDate: "2026-11-15",
			raw: {
				caalm_title: "Custom Title Deal",
				contract_value: "42000",
				vendor_name: "Mapped Vendor LLC",
			},
		};
		const payload = mapDealToDraftPayload({
			deal: mappedDeal,
			orgId: "org_1",
			ownerId: "user_1",
		});
		expect(payload.contractName).toBe("Custom Title Deal");
		expect(payload.amount).toBe(42000);
		expect(payload.vendor).toBe("Mapped Vendor LLC");
		expect(payload.description).toContain("Mapped Vendor LLC");
		expect(payload.description).toContain("Alex Rivera");
		expect(payload.description).toContain("hubspot:mapped-1");
		expect(payload.priority).toBe("Medium");
	});

	it("is idempotent at the reference key — same deal always maps to the same crmReference", () => {
		const first = mapDealToDraftPayload({
			deal,
			orgId: "org_1",
			ownerId: "user_1",
		});
		const second = mapDealToDraftPayload({
			deal,
			orgId: "org_1",
			ownerId: "user_2",
		});
		expect(first.crmReference).toBe(second.crmReference);
		expect(crmReferenceFor("hubspot", "12345")).toBe(first.crmReference);
	});

	it("returns the existing contract when the origin link is already stored", async () => {
		vi.mocked(findOriginLink).mockResolvedValue({
			$id: "link_1",
			orgId: "org_1",
			provider: "hubspot",
			external_id: "12345",
			contract_id: "contract_existing",
			created_at: "2026-09-02T00:00:00.000Z",
		});

		const result = await createDraftFromCrmDeal({
			orgId: "org_1",
			ownerId: "user_1",
			deal,
		});

		expect(result.alreadyLinked).toBe(true);
		expect(result.contractId).toBe("contract_existing");
		expect(assertCanCreateContract).not.toHaveBeenCalled();
		expect(createOriginLink).not.toHaveBeenCalled();
	});
});

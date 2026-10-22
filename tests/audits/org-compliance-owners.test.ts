import { beforeEach, describe, expect, it, vi } from "vitest";

const listRows = vi.fn();

vi.mock("@/lib/appwrite", () => ({
	createAdminClient: async () => ({ tablesDB: { listRows } }),
}));
vi.mock("@/lib/appwrite/config", () => ({
	appwriteConfig: { databaseId: "db", contractsCollectionId: "contracts" },
}));
vi.mock("@/lib/soft-delete", () => ({ excludeSoftDeletedQuery: () => "" }));
vi.mock("@/lib/audits/readiness/record-tags", () => ({
	listTagsForOrg: async () => [],
	groupRequirementIdsByRecord: () => new Map(),
}));
vi.mock("@/lib/api/licenses/services/LicenseService", () => ({
	LicenseService: {
		listLicenses: async () => ({
			licenses: [
				{
					$id: "lic1",
					licenseName: "Group home license",
					compliance: "non-compliant",
					status: "active",
					licenseExpiryDate: "2020-01-01",
					assignedManagers: ["mgr-license"],
					licenseOwnerId: "owner-license",
				},
				{
					$id: "lic2",
					licenseName: "Fine license",
					compliance: "compliant",
					status: "active",
					licenseExpiryDate: "2999-01-01",
				},
			],
		}),
		getExpiringLicenses: async () => [],
	},
}));

import { getOrgComplianceSnapshot } from "@/lib/audits/readiness/org-compliance";

describe("org compliance snapshot owners", () => {
	beforeEach(() => {
		listRows.mockResolvedValue({
			rows: [
				{
					$id: "c1",
					contractName: "Government Contract",
					compliance: "action-required",
					contractExpiryDate: "2027-09-30T12:00:00.000+00:00",
					assignedManagers: ["mgr-1", "mgr-2"],
					contractOwnerId: "owner-1",
				},
			],
		});
	});

	it("carries the contract's assigned managers and owner onto its evidence row", async () => {
		const snapshot = await getOrgComplianceSnapshot("org1");
		const row = snapshot.contracts?.evidence.find((item) => item.id === "c1");
		expect(row?.assignedManagers).toEqual(["mgr-1", "mgr-2"]);
		expect(row?.assignedBy).toBe("owner-1");
	});

	it("carries license managers and owner, and counts expired licenses", async () => {
		const snapshot = await getOrgComplianceSnapshot("org1");
		const row = snapshot.licenses?.evidence.find((item) => item.id === "lic1");
		expect(row?.assignedManagers).toEqual(["mgr-license"]);
		expect(row?.assignedBy).toBe("owner-license");
		expect(snapshot.licenses?.expired).toBe(1);
	});
});

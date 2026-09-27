import { describe, expect, it } from "vitest";
import {
	assembleFunderSnapshot,
	approvedGrantVolunteerMinutes,
} from "@/lib/funding/funder-snapshot";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.6 funder snapshot composition", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.6",
	);

	it("is catalogued as funder snapshot composition", () => {
		expect(task?.title).toMatch(/Funder snapshot composition/i);
	});

	it("drops gifts from another org", () => {
		const snapshot = assembleFunderSnapshot({
			orgId: "org-a",
			contractId: "grant-1",
			contractName: "Demo grant",
			fund: { fundId: "f1", code: "R01", name: "Restricted" },
			restrictions: [],
			budgetLines: [],
			obligations: [],
			gifts: [
				{
					orgId: "org-b",
					$id: "g1",
					giftDate: "2026-01-01",
					amount: 500,
					currency: "USD",
					status: "posted",
					constituentId: "c1",
				},
			],
			volunteerHours: [],
		});
		expect(snapshot.gifts).toHaveLength(0);
		expect(snapshot.giftsCashTotal).toBe(0);
	});

	it("includes approved volunteer hours tagged to the grant", () => {
		const minutes = approvedGrantVolunteerMinutes({
			orgId: "org-a",
			contractId: "grant-1",
			contractName: "Demo grant",
			fund: null,
			restrictions: [],
			budgetLines: [],
			obligations: [],
			gifts: [],
			volunteerHours: [
				{
					orgId: "org-a",
					approvalStatus: "approved",
					grantContractId: "grant-1",
					workedAt: "2026-02-01",
					minutesWorked: 120,
					volunteerConstituentId: "vol-1",
				},
				{
					orgId: "org-a",
					approvalStatus: "pending",
					grantContractId: "grant-1",
					workedAt: "2026-02-02",
					minutesWorked: 60,
					volunteerConstituentId: "vol-2",
				},
			],
		});
		expect(minutes).toBe(120);
	});
});

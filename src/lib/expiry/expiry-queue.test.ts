import { describe, expect, it } from "vitest";
import {
	buildExpiryQueue,
	calculateDaysUntilExpiry,
	parseExpiryShownState,
} from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

function isoOffset(days: number): string {
	const d = new Date();
	d.setHours(12, 0, 0, 0);
	d.setDate(d.getDate() + days);
	return d.toISOString();
}

function fakeContract(id: string, days: number, name = "Contract"): UIFileDoc {
	return {
		$id: id,
		$createdAt: "",
		$updatedAt: "",
		$permissions: [],
		$type: "",
		$typeId: "",
		type: "document",
		extension: "pdf",
		url: "",
		name,
		size: 0,
		owner: "owner",
		users: [],
		contractName: name,
		contractExpiryDate: isoOffset(days),
		status: "active",
	} as UIFileDoc;
}

function fakeLicense(id: string, days: number, name = "License"): License {
	return {
		$id: id,
		$createdAt: "",
		$updatedAt: "",
		licenseName: name,
		licenseNumber: "L-1",
		licenseType: "Professional",
		licenseExpiryDate: isoOffset(days).slice(0, 10),
		issuingAuthority: "State Board",
		issueDate: isoOffset(-365).slice(0, 10),
		status: "active",
	};
}

describe("calculateDaysUntilExpiry", () => {
	it("returns 0 for today", () => {
		expect(calculateDaysUntilExpiry(isoOffset(0))).toBe(0);
	});

	it("returns null for missing date", () => {
		expect(calculateDaysUntilExpiry(undefined)).toBeNull();
	});
});

describe("buildExpiryQueue", () => {
	it("merges contracts and licenses sorted by days", () => {
		const queue = buildExpiryQueue({
			contracts: [
				fakeContract("c30", 30, "C30"),
				fakeContract("c5", 5, "C5"),
			],
			licenses: [fakeLicense("l10", 10, "L10")],
		});
		expect(queue.map((i) => i.id)).toEqual(["c5", "l10", "c30"]);
		expect(queue[0].kind).toBe("contract");
		expect(queue[1].kind).toBe("license");
	});

	it("filters outside 0-30 unless bypassWindow", () => {
		const queue = buildExpiryQueue({
			contracts: [fakeContract("c40", 40), fakeContract("c-1", -1)],
			licenses: [],
		});
		expect(queue).toHaveLength(0);

		const bypassed = buildExpiryQueue({
			contracts: [fakeContract("c40", 40)],
			licenses: [],
			bypassWindow: true,
		});
		expect(bypassed).toHaveLength(1);
	});

	it("respects shown suppress lists", () => {
		const queue = buildExpiryQueue({
			contracts: [fakeContract("c1", 3)],
			licenses: [fakeLicense("l1", 4)],
			shown: { contracts: ["c1"], licenses: [] },
		});
		expect(queue.map((i) => i.id)).toEqual(["l1"]);
	});
});

describe("parseExpiryShownState", () => {
	it("migrates legacy string arrays", () => {
		expect(parseExpiryShownState(JSON.stringify(["a", "b"]))).toEqual({
			contracts: ["a", "b"],
			licenses: [],
		});
	});

	it("reads structured state", () => {
		expect(
			parseExpiryShownState(
				JSON.stringify({ contracts: ["c"], licenses: ["l"] }),
			),
		).toEqual({ contracts: ["c"], licenses: ["l"] });
	});
});

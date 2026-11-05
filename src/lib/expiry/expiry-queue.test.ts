import { describe, expect, it } from "vitest";
import {
	buildExpiryQueue,
	calculateDaysUntilExpiry,
	isExpiryModalTriggerItem,
	isInExpiryDisplayWindow,
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
		$sequence: 0,
		$collectionId: "files",
		$databaseId: "default-db",
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
		status: days < 0 ? "expired" : "active",
		orgId: "org-1",
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

describe("display / trigger windows", () => {
	it("includes recently expired through 90 days ahead in the display window", () => {
		expect(isInExpiryDisplayWindow(-30)).toBe(true);
		expect(isInExpiryDisplayWindow(-31)).toBe(false);
		expect(isInExpiryDisplayWindow(90)).toBe(true);
		expect(isInExpiryDisplayWindow(91)).toBe(false);
	});

	it("only triggers the modal for 0–30 day items", () => {
		expect(isExpiryModalTriggerItem(-3)).toBe(false);
		expect(isExpiryModalTriggerItem(0)).toBe(true);
		expect(isExpiryModalTriggerItem(30)).toBe(true);
		expect(isExpiryModalTriggerItem(48)).toBe(false);
	});
});

describe("buildExpiryQueue", () => {
	it("merges contracts and licenses sorted by days", () => {
		const queue = buildExpiryQueue({
			contracts: [fakeContract("c30", 30, "C30"), fakeContract("c5", 5, "C5")],
			licenses: [fakeLicense("l10", 10, "L10")],
		});
		expect(queue.map((i) => i.id)).toEqual(["c5", "l10", "c30"]);
		expect(queue[0].kind).toBe("contract");
		expect(queue[1].kind).toBe("license");
	});

	it("keeps recently expired and up-to-90-day items; drops older / farther", () => {
		const queue = buildExpiryQueue({
			contracts: [
				fakeContract("past", -12),
				fakeContract("farPast", -40),
				fakeContract("soon", 48),
				fakeContract("far", 100),
			],
			licenses: [fakeLicense("lExpired", -5)],
		});
		expect(queue.map((i) => i.id).sort()).toEqual(
			["lExpired", "past", "soon"].sort(),
		);
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

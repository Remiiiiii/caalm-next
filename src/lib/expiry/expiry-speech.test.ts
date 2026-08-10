import { describe, expect, it } from "vitest";
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import { formatExpiryQueueSpeech } from "@/lib/expiry/expiry-speech";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

const contractItem = (id: string, days: number): ExpiryQueueItem => ({
	kind: "contract",
	id,
	days,
	file: {
		$id: id,
		contractName: `Contract ${id}`,
		contractExpiryDate: "2026-09-01",
		status: "active",
		amount: 1000,
		contractType: "Service",
		vendor: "Acme",
	} as UIFileDoc,
});

const licenseItem = (id: string, days: number): ExpiryQueueItem => ({
	kind: "license",
	id,
	days,
	license: {
		$id: id,
		licenseName: `License ${id}`,
		licenseNumber: "1",
		licenseType: "Professional",
		licenseExpiryDate: "2026-09-15",
		issuingAuthority: "Board",
		issueDate: "2025-01-01",
		status: "active",
		$createdAt: "",
		$updatedAt: "",
	} as License,
});

describe("formatExpiryQueueSpeech", () => {
	it("single item has no multi-item intro line", () => {
		const text = formatExpiryQueueSpeech({
			items: [contractItem("a", 10)],
			index: 0,
			mode: "open",
			userFullName: "Ada Lovelace",
		});
		expect(text).not.toContain("Let's begin with the first item on the list");
		expect(text).toContain("Ada");
		expect(text).toContain("Contract a");
	});

	it("multi open includes count and first-item intro", () => {
		const text = formatExpiryQueueSpeech({
			items: [contractItem("a", 5), licenseItem("b", 8)],
			index: 0,
			mode: "open",
			userFullName: "Ada Lovelace",
		});
		expect(text).toContain("2 items expiring soon");
		expect(text).toContain("1 contract and 1 license");
		expect(text).toContain("Let's begin with the first item on the list");
		expect(text).toContain("Contract a");
	});

	it("open mode at index 0 keeps count intro even when greeting is present", () => {
		const text = formatExpiryQueueSpeech({
			items: [contractItem("a", 5), contractItem("c", 12), licenseItem("b", 8)],
			index: 0,
			mode: "open",
			userFullName: "Ada Lovelace",
		});
		expect(text).toMatch(/You have 3 items expiring soon/);
		expect(text.indexOf("3 items")).toBeLessThan(text.indexOf("Contract a"));
	});

	it("navigate mode skips list intro", () => {
		const text = formatExpiryQueueSpeech({
			items: [contractItem("a", 5), licenseItem("b", 8)],
			index: 1,
			mode: "navigate",
			userFullName: "Ada Lovelace",
		});
		expect(text).not.toContain("Let's begin with the first item on the list");
		expect(text).not.toContain("2 items expiring soon");
		expect(text).toContain("License b");
	});
});

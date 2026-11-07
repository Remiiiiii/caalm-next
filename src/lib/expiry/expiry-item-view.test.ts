import { describe, expect, it } from "vitest";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";
import { getItemAmount, toExpiryItemView } from "./expiry-item-view";
import type { ExpiryQueueItem } from "./expiry-queue";

function contractItem(
	overrides: Partial<UIFileDoc> & {
		counterpartyContactEmail?: string;
		amount?: number;
	} = {},
): ExpiryQueueItem {
	return {
		kind: "contract",
		id: "c1",
		days: 12,
		file: {
			$id: "c1",
			contractName: "NIH SBIR",
			contractExpiryDate: "2026-12-13",
			status: "active",
			amount: 175_000,
			...overrides,
		} as UIFileDoc,
	};
}

function licenseItem(overrides: Partial<License> = {}): ExpiryQueueItem {
	return {
		kind: "license",
		id: "l1",
		days: 26,
		license: {
			$id: "l1",
			licenseName: "Adobe Creative Cloud",
			licenseExpiryDate: "2026-07-01",
			status: "active",
			cost: 8_640,
			...overrides,
		} as License,
	};
}

describe("toExpiryItemView", () => {
	it("maps contract title, amount label, and contact", () => {
		const view = toExpiryItemView(
			contractItem({ counterpartyContactEmail: "a@b.com" }),
		);
		expect(view.title).toBe("NIH SBIR");
		expect(view.amount).toBe(175_000);
		expect(view.amountLabel).toBe("Amount");
		expect(view.contact?.email).toBe("a@b.com");
		expect(view.renewing).toBe(false);
	});

	it("maps license cost as annual cost and autoRenew as renewing", () => {
		const view = toExpiryItemView(licenseItem({ autoRenew: true }));
		expect(view.amount).toBe(8_640);
		expect(view.amountLabel).toBe("Annual cost");
		expect(view.renewing).toBe(true);
		expect(view.contact).toBeNull();
	});
});

describe("getItemAmount", () => {
	it("returns null when the record has no money value", () => {
		expect(getItemAmount(licenseItem({ cost: undefined }))).toBeNull();
	});
});

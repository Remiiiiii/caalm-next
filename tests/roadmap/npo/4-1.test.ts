import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NET_ASSET_CLASSES } from "@/lib/funds";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.1 funds table", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.1",
	);

	it("is catalogued as funds table", () => {
		expect(task?.title).toMatch(/Funds table/i);
	});

	it("allows only three net-asset classes", () => {
		expect(NET_ASSET_CLASSES).toEqual([
			"unrestricted",
			"temporarily_restricted",
			"permanently_restricted",
		]);
	});

	it("uses alphanumeric org_funds collection id", () => {
		expect(appwriteConfig.orgFundsCollectionId).toMatch(/^[a-zA-Z0-9]{20,36}$/);
	});
});

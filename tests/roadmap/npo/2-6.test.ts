import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UNRESTRICTED_FUND_CODE } from "@/lib/designations";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.6 designations and fund codes", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.6",
	);

	it("is catalogued as designations", () => {
		expect(task?.title).toMatch(/Designations/i);
	});

	it("defaults gifts without designation to unrestricted fundCode", () => {
		expect(UNRESTRICTED_FUND_CODE).toBe("UNRESTRICTED");
		const repo = readFileSync(
			join(process.cwd(), "src/lib/gifts/repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/resolveFundForGift/);
		expect(repo).toMatch(/fundCode/);
	});

	it("uses alphanumeric designations collection id", () => {
		expect(appwriteConfig.giftDesignationsCollectionId).toMatch(
/^[a-zA-Z0-9]+$/,
		);
		const detail = readFileSync(
			join(process.cwd(), "src/lib/gifts/enrich.ts"),
			"utf8",
		);
		expect(detail).toMatch(/designationLabel/);
	});
});

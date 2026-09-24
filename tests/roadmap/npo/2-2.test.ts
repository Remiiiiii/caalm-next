import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.2 gifts table and receipt allocator", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.2",
	);

	it("is catalogued as gifts schema", () => {
		expect(task?.title).toMatch(/Gifts table/i);
	});

	it("uses alphanumeric collection ids", () => {
		expect(appwriteConfig.giftsCollectionId).toMatch(/^[a-zA-Z0-9]+$/);
		expect(appwriteConfig.giftReceiptCountersCollectionId).toMatch(
/^[a-zA-Z0-9]+$/,
		);
		const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
		expect(example).toMatch(/NEXT_PUBLIC_APPWRITE_GIFTS_COLLECTION=/);
	});

	it("allocates receipts in one module", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/gifts/receipt.ts"),
			"utf8",
		);
		expect(source).toMatch(/allocateReceiptNumber/);
	});
});

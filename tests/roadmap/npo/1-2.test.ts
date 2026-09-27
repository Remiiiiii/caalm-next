import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.2 constituents table schema", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.2",
	);

	it("is catalogued as the constituents table", () => {
		expect(task?.title).toMatch(/schema/i);
	});

	it("uses an alphanumeric collection id, not the name constituents", () => {
		expect(appwriteConfig.constituentsCollectionId).toMatch(/^[a-zA-Z0-9]+$/);
		expect(appwriteConfig.constituentsCollectionId).not.toBe("constituents");

		const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
		const match = example.match(
			/NEXT_PUBLIC_APPWRITE_CONSTITUENTS_COLLECTION=(\S+)/,
		);
		expect(match?.[1]).toMatch(/^[a-zA-Z0-9]+$/);
		expect(match?.[1]).not.toBe("constituents");
	});
});

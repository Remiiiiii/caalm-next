import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.3 gift write APIs", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.3",
	);
	const patchRoute = readFileSync(
		join(process.cwd(), "src/app/api/gifts/[id]/route.ts"),
		"utf8",
	);
	const voidRoute = readFileSync(
		join(process.cwd(), "src/app/api/gifts/[id]/void/route.ts"),
		"utf8",
	);

	it("is catalogued as gift APIs", () => {
		expect(task?.title).toMatch(/APIs/i);
	});

	it("blocks edits to posted gifts", () => {
		expect(patchRoute).toMatch(/status: 409/);
		expect(patchRoute).toMatch(/Posted gifts cannot change/);
	});

	it("gates void with gifts.void", () => {
		expect(voidRoute).toMatch(/PERMISSIONS\.GIFTS\.VOID/);
		expect(voidRoute).toMatch(/voidPostedGift/);
	});
});

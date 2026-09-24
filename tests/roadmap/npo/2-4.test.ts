import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.4 gift list and detail UI", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.4",
	);
	const listUi = readFileSync(
		join(process.cwd(), "src/components/gifts/GiftsPageClient.tsx"),
		"utf8",
	);

	it("is catalogued as gift UI", () => {
		expect(task?.title).toMatch(/list and detail/i);
	});

	it("uses SearchField, PageIndex, and CAALM status badges", () => {
		expect(listUi).toMatch(/SearchField/);
		expect(listUi).toMatch(/PageIndex/);
		expect(listUi).toMatch(/giftStatusBadgeClass/);
	});

	it("guards the route with gifts.view", () => {
		const page = readFileSync(
			join(process.cwd(), "src/app/(root)/gifts/page.tsx"),
			"utf8",
		);
		expect(page).toMatch(/PERMISSIONS\.GIFTS\.VIEW/);
	});
});

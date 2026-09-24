import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.10 duplicate merge wizard", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.10",
	);
	const previewRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/merge/preview/route.ts"),
		"utf8",
	);
	const commitRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/merge/route.ts"),
		"utf8",
	);
	const mergeLib = readFileSync(
		join(process.cwd(), "src/lib/constituents/merge.ts"),
		"utf8",
	);
	const idRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/[id]/route.ts"),
		"utf8",
	);
	const dialog = readFileSync(
		join(process.cwd(), "src/components/constituents/MergeConstituentsDialog.tsx"),
		"utf8",
	);

	it("is catalogued with preview and commit children", () => {
		expect(task?.title).toMatch(/merge/i);
		expect(task?.children?.map((row) => row.taskCode)).toEqual([
			"1.10.a",
			"1.10.b",
		]);
	});

	it("previews without writes and 404s a cross-org pair", () => {
		expect(previewRoute).toMatch(/previewConstituentMerge/);
		expect(previewRoute).toMatch(/PERMISSIONS\.CONSTITUENTS\.MANAGE/);
		expect(mergeLib).toMatch(/Dry-run only/);
		expect(mergeLib).toMatch(/must not write rows/);
		expect(mergeLib).toMatch(/status: 404/);
		expect(mergeLib).not.toMatch(/createRow/);
	});

	it("commits all-or-nothing and audits winner, loser, and actor", () => {
		expect(commitRoute).toMatch(/commitConstituentMerge/);
		expect(mergeLib).toMatch(/All-or-nothing/);
		expect(mergeLib).toMatch(/rolled back/);
		expect(mergeLib).toMatch(/mergedIntoId/);
		expect(mergeLib).toMatch(/winnerId/);
		expect(mergeLib).toMatch(/loserId/);
		expect(mergeLib).toMatch(/actorUserId/);
		expect(idRoute).toMatch(/status:\s*410/);
		expect(idRoute).toMatch(/mergedIntoId/);
		expect(dialog).toMatch(/\/api\/constituents\/merge\/preview/);
		expect(dialog).toMatch(/\/api\/constituents\/merge/);
	});
});

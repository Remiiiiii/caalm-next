import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.8 interaction timeline", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.8",
	);
	const notesRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/[id]/notes/route.ts"),
		"utf8",
	);
	const deleteRoute = readFileSync(
		join(
			process.cwd(),
			"src/app/api/constituents/[id]/notes/[noteId]/route.ts",
		),
		"utf8",
	);
	const timelineRoute = readFileSync(
		join(process.cwd(), "src/app/api/constituents/[id]/timeline/route.ts"),
		"utf8",
	);
	const derived = readFileSync(
		join(process.cwd(), "src/lib/constituents/timeline.ts"),
		"utf8",
	);
	const tab = readFileSync(
		join(process.cwd(), "src/components/constituents/TimelineTab.tsx"),
		"utf8",
	);

	it("is catalogued as the interaction timeline", () => {
		expect(task?.title).toMatch(/timeline/i);
	});

	it("writes notes with manage and lists them after create", () => {
		expect(notesRoute).toMatch(/PERMISSIONS\.CONSTITUENTS\.MANAGE/);
		expect(notesRoute).toMatch(/createNote/);
		expect(tab).toMatch(/Add note/);
		expect(tab).toMatch(/\/api\/constituents\/\$\{constituentId\}\/notes/);
	});

	it("audit-logs note delete and derives contract/grant rows", () => {
		expect(deleteRoute).toMatch(/logConstituentAudit/);
		expect(deleteRoute).toMatch(/action:\s*"delete"/);
		expect(timelineRoute).toMatch(/listDerivedAgreements/);
		expect(derived).toMatch(/vendor/);
		expect(derived).toMatch(/funder/);
		expect(derived).toMatch(/never copies/);
		expect(derived).not.toMatch(/createRow/);
	});
});

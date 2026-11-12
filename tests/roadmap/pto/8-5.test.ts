import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 8.5 assign_volunteer tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/constituentTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "assign_volunteer"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers assign_volunteer", () => {
		expect(source).toMatch(/name:\s*"assign_volunteer"/);
	});

	it("lists under volunteers.view, assigns using the shift's real capacity under volunteers.manage, and audits", () => {
		expect(toolBlock).toContain("listVolunteerShiftsForOrg(");
		expect(toolBlock).toContain("getVolunteerShiftById(");
		expect(toolBlock).toContain("bookVolunteerOnShift(");
		expect(toolBlock).toContain("shift.shiftCapacity");
		expect(toolBlock).toMatch(/PERMISSIONS\.VOLUNTEERS\.VIEW/);
		expect(toolBlock).toMatch(/PERMISSIONS\.VOLUNTEERS\.MANAGE/);
		expect(toolBlock).toContain("auditNonprofit(");
	});
});

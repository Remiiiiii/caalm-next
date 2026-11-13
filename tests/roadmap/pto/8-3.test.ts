import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 8.3 log_gift tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/constituentTools.ts"),
		"utf8",
	);
	const start = source.indexOf('name: "log_gift"');
	const next = source.indexOf('\n\t{\n\t\tname: "', start + 1);
	const toolBlock = source.slice(start, next === -1 ? undefined : next);

	it("registers log_gift", () => {
		expect(source).toMatch(/name:\s*"log_gift"/);
	});

	it("lists under gifts.view, logs (draft then post) under gifts.create, and audits logging", () => {
		expect(toolBlock).toContain("listGifts(");
		expect(toolBlock).toContain("createDraftGift(");
		expect(toolBlock).toContain("postGift(");
		expect(toolBlock).toMatch(/PERMISSIONS\.GIFTS\.VIEW/);
		expect(toolBlock).toMatch(/PERMISSIONS\.GIFTS\.CREATE/);
		expect(toolBlock).toContain("auditNonprofit(");
	});
});

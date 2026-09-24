import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.8 waiver e-sign reuse", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.8",
	);

	it("is catalogued as waiver e-sign", () => {
		expect(task?.title).toMatch(/Waiver e-sign/i);
	});

	it("uses acknowledgment purpose and volunteer waiver copy", () => {
		const service = readFileSync(
			join(process.cwd(), "src/lib/volunteers/volunteer-waiver.service.ts"),
			"utf8",
		);
		expect(service).toMatch(/acknowledgment/);
		expect(service).toMatch(/Volunteer waiver/);
	});

	it("does not activate contracts on acknowledgment completion", () => {
		const activate = readFileSync(
			join(process.cwd(), "src/lib/esign/activate.ts"),
			"utf8",
		);
		expect(activate).toMatch(/isAcknowledgment/);
		expect(activate).toMatch(/no contract activation/);
	});
});

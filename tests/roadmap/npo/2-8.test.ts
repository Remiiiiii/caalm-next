import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.8 pledge installments and cron", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.8",
	);

	it("is catalogued as pledges", () => {
		expect(task?.title).toMatch(/Pledge/i);
	});

	it("gates cron with CRON_SECRET", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/cron/npo-pledges/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/status: 401/);
		expect(route).toMatch(/isAuthorizedCron/);
	});

	it("links at most one draft gift per installment", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/pledges/repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/giftId/);
		expect(repo).toMatch(/processDuePledgeInstallments/);
	});
});

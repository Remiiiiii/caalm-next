import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GRANT_CAPABLE_CONTRACT_TYPES } from "@/lib/gifts/grant-contract";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.10 link gifts to grant contracts", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.10",
	);

	it("is catalogued as contract link", () => {
		expect(task?.title).toMatch(/grant contracts/i);
	});

	it("restricts contractId to grant-capable types", () => {
		expect(GRANT_CAPABLE_CONTRACT_TYPES.has("Grant_Agreement")).toBe(true);
		const repo = readFileSync(
			join(process.cwd(), "src/lib/gifts/repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/assertGrantContractForOrg/);
	});

	it("shows linked gifts on the funding panel API", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/funding/streams/[contractId]/gifts/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/listPostedGiftsForContract/);
		const panel = readFileSync(
			join(process.cwd(), "src/components/funding/FundingLinkedGifts.tsx"),
			"utf8",
		);
		expect(panel).toMatch(/cashTotal/);
	});
});

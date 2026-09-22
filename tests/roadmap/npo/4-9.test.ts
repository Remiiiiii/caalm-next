import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.9 release fund legs for journal export", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.9",
	);

	it("is catalogued for journal export tagging", () => {
		expect(task?.title).toMatch(/journal export/i);
	});

	it("stores fundFrom and fundTo on release rows", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/funding/restriction-release.repository.ts"),
			"utf8",
		);
		expect(source).toMatch(/fundFrom/);
		expect(source).toMatch(/fundTo/);
	});

	it("does not call third-party accounting APIs in release repository", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/funding/restriction-release.repository.ts"),
			"utf8",
		);
		expect(source.toLowerCase()).not.toMatch(/quickbooks/);
		expect(source.toLowerCase()).not.toMatch(/stripe/);
	});

	it("uses alphanumeric restriction_releases collection id", () => {
		expect(appwriteConfig.restrictionReleasesCollectionId).toMatch(
/^[a-zA-Z0-9]{20,36}$/,
		);
	});
});

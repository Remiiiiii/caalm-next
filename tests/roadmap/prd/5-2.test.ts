import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	filterITNavigationByPermissions,
	IT_NAVIGATION,
} from "@/constants/it-navigation";
import {
	IT_PLACEHOLDER_ROUTE_COUNT,
	IT_PLACEHOLDER_ROUTES,
	isITPlaceholderNavUrl,
} from "@/lib/it/placeholder-routes";
import { PERMISSIONS } from "@/constants/permissions";

describe("PRD 5.2 hide or badge placeholder IT pages", () => {
	it("documents thirty placeholder routes", () => {
		expect(IT_PLACEHOLDER_ROUTE_COUNT).toBe(30);
		expect(IT_PLACEHOLDER_ROUTES).toHaveLength(30);
	});

	it("primary IT nav hides placeholder URLs by default", () => {
		const allPerms = Object.values(PERMISSIONS.IT) as string[];
		const filtered = filterITNavigationByPermissions(
			IT_NAVIGATION,
			allPerms as never[],
		);
		const urls = filtered.flatMap((s) => s.items.map((i) => i.url));
		for (const url of urls) {
			expect(isITPlaceholderNavUrl(url)).toBe(false);
		}
		expect(urls).toContain("/dashboard/it");
		expect(urls).toContain("/dashboard/it/storage");
	});

	it("placeholder page shows Preview badge", () => {
		const source = readFileSync(
			join(process.cwd(), "src/components/it/ITPlaceholderPage.tsx"),
			"utf8",
		);
		expect(source).toMatch(/SampleDataBadge/);
		expect(source).toMatch(/Preview/);
	});

	it("note records placeholder count", () => {
		const note = readFileSync(
			join(process.cwd(), "docs/internal/it-portal-credibility-note.md"),
			"utf8",
		);
		expect(note).toMatch(/30/);
		expect(note).toMatch(/placeholder/i);
	});
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string): string {
	return readFileSync(join(process.cwd(), path), "utf8");
}

describe("TODO 4.1 org data storage: real metrics audit", () => {
	it("sidebar storage widget fetches live usage, not a hardcoded value", () => {
		const hook = read("src/hooks/useStorageUsage.ts");
		expect(hook).toMatch(/fetch\(STORAGE_USAGE_SWR_KEY/);
		expect(hook).not.toMatch(/Math\.random|mockStorage|sampleUsage/i);
	});

	it("/api/storage/usage (the sidebar's data source) computes usage from real Appwrite file rows", () => {
		const route = read("src/app/api/storage/usage/route.ts");
		expect(route).toMatch(/getTotalSpaceUsed/);

		const actions = read("src/lib/actions/file.actions.ts");
		expect(actions).toMatch(/export async function getTotalSpaceUsed/);
		expect(actions).toMatch(/tablesDB\.listRows/);
	});

	it("/api/it/storage-metrics is a separate local-disk-scan metric, clearly labeled as such (not presented as the org's Appwrite storage figure)", () => {
		const route = read("src/app/api/it/storage-metrics/route.ts");
		expect(route).toMatch(/source:\s*"local-disk-scan"/);
		expect(route).toMatch(/Appwrite file storage is separate/i);
	});

	it("the storage-metrics IT page surfaces the notice instead of presenting the scan as an exact figure", () => {
		const page = read("src/app/(root)/dashboard/it/storage/page.tsx");
		expect(page).toMatch(/metrics\.notice/);
		expect(page).toMatch(/Not configured/);
	});
});

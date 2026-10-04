import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUseAuditMockData } from "@/lib/audits/audit-mock-flag";

describe("PRD 4.1 real audit data by default in production", () => {
	it("defaults mock OFF in production when env is unset", () => {
		expect(
			resolveUseAuditMockData({
				explicit: undefined,
				nodeEnv: "production",
				appMode: undefined,
			}),
		).toBe(false);
	});

	it("allows mock in development and demo mode when unset", () => {
		expect(
			resolveUseAuditMockData({
				explicit: undefined,
				nodeEnv: "development",
			}),
		).toBe(true);
		expect(
			resolveUseAuditMockData({
				explicit: undefined,
				nodeEnv: "production",
				appMode: "demo",
			}),
		).toBe(true);
	});

	it("explicit false wins even in development", () => {
		expect(
			resolveUseAuditMockData({
				explicit: "false",
				nodeEnv: "development",
				appMode: "demo",
			}),
		).toBe(false);
	});

	it("status page shows DEMO badge when mock is enabled", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/(root)/audits/status/page.tsx"),
			"utf8",
		);
		expect(source).toMatch(/USE_AUDIT_MOCK_DATA/);
		expect(source).toMatch(/SampleDataBadge/);
		expect(source).toMatch(/tone=["']demo["']/);
	});

	it("mock-data no longer defaults true whenever env is not literally false", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/audits/mock-data.ts"),
			"utf8",
		);
		expect(source).not.toMatch(
			/NEXT_PUBLIC_AUDIT_MOCK_DATA\s*!==\s*["']false["']/,
		);
		expect(source).toMatch(/isAuditMockDataEnabled/);
	});
});

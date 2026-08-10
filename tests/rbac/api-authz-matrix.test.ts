/**
 * API authz CI matrix (ratchet).
 *
 * Fails when:
 * - A new unguarded route appears that is not in the baseline
 * - Allowlist entries point at missing routes
 *
 * Does not fail on grandfathered baseline gaps (fix those over time).
 */

import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { API_AUTHZ_ALLOWLIST } from "@/lib/rbac/api-authz-allowlist";
import {
	assertAllowlistPathsExist,
	diffUnguardedAgainstBaseline,
	loadApiAuthzBaseline,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

describe("API authz matrix", () => {
	const routes = scanApiAuthzMatrix();
	const baseline = loadApiAuthzBaseline();
	const diff = diffUnguardedAgainstBaseline(routes, baseline);

	it("discovers API route handlers", () => {
		expect(routes.length).toBeGreaterThan(100);
	});

	it("has a non-empty baseline file committed for the ratchet", () => {
		expect(baseline.unguarded.length).toBeGreaterThan(0);
		expect(Array.isArray(baseline.unguarded)).toBe(true);
	});

	it("allowlist entries reference real route paths", () => {
		const missing = assertAllowlistPathsExist(routes);
		expect(missing).toEqual([]);
	});

	it("allowlist entries include a reason", () => {
		for (const entry of API_AUTHZ_ALLOWLIST) {
			expect(entry.reason.trim().length).toBeGreaterThan(5);
		}
	});

	it("does not allow the unguarded set to grow (ratchet)", () => {
		if (diff.newUnguarded.length > 0) {
			const sample = diff.newUnguarded.slice(0, 20).join("\n  - ");
			expect.fail(
				[
					`Found ${diff.newUnguarded.length} new unguarded API route(s) not in api-authz-baseline.json.`,
					"Add requirePermission / session auth / cron secret / webhook verification,",
					"or add an intentional allowlist entry with a reason,",
					"or (rarely) regenerate the baseline after review:",
					"  pnpm run api-authz:baseline",
					"",
					"New unguarded routes:",
					`  - ${sample}`,
				].join("\n"),
			);
		}
	});

	it("reports matrix summary (permissions vs session vs gaps)", () => {
		const counts = routes.reduce(
			(acc, r) => {
				acc[r.detected] = (acc[r.detected] ?? 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		// Soft assertions: we expect some permission-gated routes already.
		expect(counts.permission ?? 0).toBeGreaterThan(20);
		expect(diff.remaining.length).toBe(baseline.unguarded.length - diff.resolved.length);

		// Keep baseline JSON sorted for stable diffs when regenerating.
		const sorted = [...baseline.unguarded].sort();
		expect(baseline.unguarded).toEqual(sorted);
	});

	it("baseline file is valid JSON on disk", () => {
		const raw = fs.readFileSync(
			"src/lib/rbac/api-authz-baseline.json",
			"utf8",
		);
		expect(() => JSON.parse(raw)).not.toThrow();
	});
});

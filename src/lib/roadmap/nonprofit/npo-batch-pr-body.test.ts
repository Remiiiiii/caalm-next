import { describe, expect, it } from "vitest";
import {
	buildNpoBatchPrBody,
	npoBatchPullRequestTitle,
	parseSpecBullets,
} from "./npo-batch-pr-body";
import { NPO_PR_BATCHES } from "./npo-pr-batches";

describe("npo batch PR body", () => {
	it("parses Who/What/Where/Why/When/How from catalog spec strings", () => {
		const spec = parseSpecBullets(
			"Implement on the existing batch PR. Who: Org admins. What: Add keys. Where: permissions.ts. Why: RBAC. When: First. How: MCP only.",
		);
		expect(spec.Who).toBe("Org admins");
		expect(spec.What).toBe("Add keys");
		expect(spec.How).toBe("MCP only");
	});

	it("never tells agents to ship a stub for S2 B1 (PR 118)", () => {
		const batch = NPO_PR_BATCHES.find((b) => b.linkedPrNumber === 118)!;
		const body = buildNpoBatchPrBody(batch);
		expect(body.toLowerCase()).not.toMatch(/\bstub\b/);
		expect(body).toMatch(/Implement \*\*all tasks in this batch\*\*/);
		expect(body).toMatch(/\*\*Do not\*\* open separate PRs per task/);
		expect(body).toMatch(/merging \*\*PR #118\*\*/i);
		expect(body).toMatch(/2\.1–2\.5/);
		expect(body).toMatch(/\*\*Who:\*\* Org admins/);
	});

	it("includes Done when bullets from the catalog", () => {
		const batch = NPO_PR_BATCHES.find((b) => b.linkedPrNumber === 118)!;
		const body = buildNpoBatchPrBody(batch);
		expect(body).toMatch(/gifts\.void is distinct from gifts\.create/);
	});

	it("titles batch PRs without stub wording", () => {
		expect(npoBatchPullRequestTitle(118)).toBe(
			"NPO S2 B1 Gift and Campaign Ledger (2.1–2.5)",
		);
		expect(npoBatchPullRequestTitle(118).toLowerCase()).not.toMatch(/\bstub\b/);
	});

	it("documents S1 B1 placeholder vs implementation PR", () => {
		const batch = NPO_PR_BATCHES.find((b) => b.linkedPrNumber === 109)!;
		const placeholder = buildNpoBatchPrBody(batch, { forPrNumber: 109 });
		expect(placeholder).toMatch(/placeholder only/);
		expect(placeholder).toMatch(/PR #131/);
		expect(placeholder.toLowerCase()).not.toMatch(/catalog stub/);

		const product = buildNpoBatchPrBody(batch, { forPrNumber: 131 });
		expect(product).toMatch(/Implement \*\*all tasks/);
		expect(product).toMatch(/PR #131/);
	});
});

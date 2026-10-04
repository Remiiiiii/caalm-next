import { describe, expect, it } from "vitest";
import {
	buildPrdBatchPrBodyDraft,
	prdBatchPullRequestTitleDraft,
} from "./prd-batch-pr-body";
import { PRD_PR_BATCHES } from "./prd-pr-batches";

describe("PRD batch PR body", () => {
	it("includes plain-English section intro and 5W+H for section 1", () => {
		const batch = PRD_PR_BATCHES.find((b) => b.sectionNumber === 1)!;
		const body = buildPrdBatchPrBodyDraft(batch);
		expect(body).toMatch(/Why this section matters/);
		expect(body).toMatch(/\*\*Who:\*\*/);
		expect(body).toMatch(/### 1\.1/);
		expect(body).toMatch(/Done when/);
	});

	it("draft title matches board convention", () => {
		const batch = PRD_PR_BATCHES.find((b) => b.sectionNumber === 2)!;
		expect(prdBatchPullRequestTitleDraft(batch)).toBe(
			"PRD S2 B1 API permission coverage (2.1–2.5)",
		);
	});
});

#!/usr/bin/env tsx
/**
 * Write full Platform Readiness batch PR bodies to pr-catalog-bodies/
 * (for GitHub PR description updates and offline review).
 */

import fs from "node:fs";
import path from "node:path";
import { buildPrdBatchPrBody } from "../src/lib/roadmap/platform-readiness/prd-batch-pr-body";
import { PRD_PR_BATCHES, prdBatchFileId } from "../src/lib/roadmap/platform-readiness/prd-pr-batches";

/** Set after catalog PRs are opened on GitHub */
export const PRD_BATCH_LINKED_PR: Record<number, number> = {
	0: 179,
	1: 180,
	2: 182,
	3: 185,
	4: 181,
	5: 184,
	6: 183,
};

const outDir = path.join(process.cwd(), "pr-catalog-bodies");
fs.mkdirSync(outDir, { recursive: true });

for (const batch of PRD_PR_BATCHES) {
	const prNumber = PRD_BATCH_LINKED_PR[batch.sectionNumber];
	if (prNumber == null) continue;
	const body = buildPrdBatchPrBody(batch, { forPrNumber: prNumber });
	const file = path.join(outDir, `${prdBatchFileId(batch)}-pr-${prNumber}.md`);
	fs.writeFileSync(file, body);
	console.log("wrote", path.relative(process.cwd(), file));
}

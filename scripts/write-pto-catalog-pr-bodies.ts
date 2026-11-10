#!/usr/bin/env tsx
/**
 * Write draft Production Tools batch PR bodies to pr-catalog-bodies/pto/
 */

import fs from "node:fs";
import path from "node:path";
import {
	buildPtoBatchPrBodyDraft,
	ptoBatchPullRequestTitleDraft,
} from "../src/lib/roadmap/production-tools/pto-batch-pr-body";
import {
	PTO_PR_BATCHES,
	ptoBatchFileId,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

const outDir = path.join(process.cwd(), "pr-catalog-bodies", "pto");
fs.mkdirSync(outDir, { recursive: true });

for (const batch of PTO_PR_BATCHES) {
	if (batch.sectionNumber < 2 || batch.linkedPrNumber != null) continue;
	const title = ptoBatchPullRequestTitleDraft(batch);
	const body = buildPtoBatchPrBodyDraft(batch);
	const meta = path.join(outDir, `${ptoBatchFileId(batch)}.meta.json`);
	const bodyPath = path.join(outDir, `${ptoBatchFileId(batch)}.md`);
	fs.writeFileSync(bodyPath, body);
	fs.writeFileSync(
		meta,
		JSON.stringify(
			{
				title,
				branch: `cursor/production-tools/${ptoBatchFileId(batch)}-5329`,
			},
			null,
			2,
		),
	);
	console.log(ptoBatchFileId(batch), title);
}

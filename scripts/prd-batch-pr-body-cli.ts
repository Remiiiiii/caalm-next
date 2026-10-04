#!/usr/bin/env tsx
/**
 * Print Platform Readiness batch PR title + body for GitHub.
 *
 *   pnpm prd:batch-pr-body --batch s01-b1
 *   pnpm prd:batch-pr-body --all
 */

import {
	buildPrdBatchPrBody,
	buildPrdBatchPrBodyDraft,
	prdBatchPullRequestTitle,
	prdBatchPullRequestTitleDraft,
} from "../src/lib/roadmap/platform-readiness/prd-batch-pr-body";
import {
	PRD_PR_BATCHES,
	prdBatchFileId,
	type PrdPrBatch,
} from "../src/lib/roadmap/platform-readiness/prd-pr-batches";

function batchFromArg(arg: string): PrdPrBatch | undefined {
	const normalized = arg.toLowerCase().replace(/^s/, "s");
	return PRD_PR_BATCHES.find(
		(b) => prdBatchFileId(b).toLowerCase() === normalized,
	);
}

function printBatch(batch: PrdPrBatch, forPrNumber: number | null) {
	const title =
		forPrNumber != null && forPrNumber > 0
			? prdBatchPullRequestTitle(forPrNumber)
			: prdBatchPullRequestTitleDraft(batch);
	const body =
		forPrNumber != null && forPrNumber > 0
			? buildPrdBatchPrBody(batch, { forPrNumber })
			: buildPrdBatchPrBodyDraft(batch);
	console.log(`--- ${prdBatchFileId(batch)} ---`);
	console.log(`TITLE: ${title}`);
	console.log("BODY:");
	console.log(body);
	console.log("");
}

const args = process.argv.slice(2);
const batchIdx = args.indexOf("--batch");
const all = args.includes("--all");

if (all) {
	for (const batch of PRD_PR_BATCHES) {
		if (batch.sectionNumber === 0) continue;
		printBatch(batch, batch.linkedPrNumber ?? null);
	}
	process.exit(0);
}

if (batchIdx >= 0) {
	const batch = batchFromArg(args[batchIdx + 1] ?? "");
	if (!batch) {
		console.error(`Unknown batch id: ${args[batchIdx + 1]}`);
		process.exit(1);
	}
	printBatch(batch, batch.linkedPrNumber ?? null);
	process.exit(0);
}

console.error("Usage: pnpm prd:batch-pr-body --batch s01-b1 | --all");
process.exit(1);

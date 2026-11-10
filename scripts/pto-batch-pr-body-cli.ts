#!/usr/bin/env tsx
/**
 * Print Production Tools Roadmap batch PR title + body for GitHub updates.
 *
 *   pnpm pto:batch-pr-body --pr 219
 *   pnpm pto:batch-pr-body --batch s02-b1
 *   pnpm pto:batch-pr-body --draft --batch s02-b1
 *   pnpm pto:batch-pr-body --all
 */

import {
	buildPtoBatchPrBody,
	buildPtoBatchPrBodyDraft,
	ptoBatchPullRequestTitle,
	ptoBatchPullRequestTitleDraft,
} from "../src/lib/roadmap/production-tools/pto-batch-pr-body";
import {
	PTO_PR_BATCHES,
	ptoBatchFileId,
	type PtoPrBatch,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

function batchFromArg(arg: string): PtoPrBatch | undefined {
	const normalized = arg.toLowerCase().replace(/^s/, "s");
	return PTO_PR_BATCHES.find(
		(b) => ptoBatchFileId(b).toLowerCase() === normalized,
	);
}

function printBatch(batch: PtoPrBatch, forPrNumber: number) {
	const title = ptoBatchPullRequestTitle(forPrNumber);
	const body = buildPtoBatchPrBody(batch, { forPrNumber });
	console.log(`--- PR #${forPrNumber} ---`);
	console.log(`TITLE: ${title}`);
	console.log("BODY:");
	console.log(body);
	console.log("");
}

const args = process.argv.slice(2);
const prIdx = args.indexOf("--pr");
const batchIdx = args.indexOf("--batch");
const all = args.includes("--all");
const draft = args.includes("--draft");

if (all) {
	for (const batch of PTO_PR_BATCHES) {
		if (batch.linkedPrNumber != null) {
			printBatch(batch, batch.linkedPrNumber);
		}
	}
	process.exit(0);
}

if (prIdx >= 0) {
	const n = Number(args[prIdx + 1]);
	const batch = PTO_PR_BATCHES.find((b) => b.linkedPrNumber === n);
	if (!batch) {
		console.error(`No PTO batch linked to PR #${n}`);
		process.exit(1);
	}
	printBatch(batch, n);
	process.exit(0);
}

if (batchIdx >= 0) {
	const batch = batchFromArg(args[batchIdx + 1] ?? "");
	if (!batch) {
		console.error(`Unknown batch: ${args[batchIdx + 1]}`);
		process.exit(1);
	}
	if (draft) {
		console.log(`TITLE: ${ptoBatchPullRequestTitleDraft(batch)}`);
		console.log("BODY:");
		console.log(buildPtoBatchPrBodyDraft(batch));
		process.exit(0);
	}
	const pr = batch.linkedPrNumber;
	if (pr == null) {
		console.error(
			`Batch ${ptoBatchFileId(batch)} has no linkedPrNumber; use --draft`,
		);
		process.exit(1);
	}
	printBatch(batch, pr);
	process.exit(0);
}

console.error(
	"Usage: pnpm pto:batch-pr-body --pr <number> | --batch s02-b1 [--draft] | --all",
);
process.exit(1);

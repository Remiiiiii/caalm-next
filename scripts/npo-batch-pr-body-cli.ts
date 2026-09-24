#!/usr/bin/env tsx
/**
 * Print Nonprofit Roadmap batch PR title + body for GitHub updates.
 *
 *   pnpm npo:batch-pr-body --pr 118
 *   pnpm npo:batch-pr-body --batch s02-b1
 *   pnpm npo:batch-pr-body --all
 */

import {
	buildNpoBatchPrBody,
	npoBatchPullRequestTitle,
} from "../src/lib/roadmap/nonprofit/npo-batch-pr-body";
import {
	NPO_PR_BATCHES,
	npoBatchFileId,
	type NpoPrBatch,
} from "../src/lib/roadmap/nonprofit/npo-pr-batches";

function batchFromArg(arg: string): NpoPrBatch | undefined {
	const normalized = arg.toLowerCase().replace(/^s/, "s");
	return NPO_PR_BATCHES.find(
		(b) => npoBatchFileId(b).toLowerCase() === normalized,
	);
}

function printBatch(batch: NpoPrBatch, forPrNumber: number) {
	const title = npoBatchPullRequestTitle(forPrNumber);
	const body = buildNpoBatchPrBody(batch, { forPrNumber });
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

if (all) {
	for (const batch of NPO_PR_BATCHES) {
		if (batch.linkedPrNumber != null) {
			printBatch(batch, batch.linkedPrNumber);
		}
		if (batch.productPrNumber != null) {
			printBatch(batch, batch.productPrNumber);
		}
	}
	process.exit(0);
}

if (prIdx >= 0) {
	const prNumber = Number(args[prIdx + 1]);
	const batch = NPO_PR_BATCHES.find(
		(b) =>
			b.linkedPrNumber === prNumber || b.productPrNumber === prNumber,
	);
	if (!batch) {
		console.error(`No nonprofit batch for PR #${prNumber}`);
		process.exit(1);
	}
	printBatch(batch, prNumber);
	process.exit(0);
}

if (batchIdx >= 0) {
	const batch = batchFromArg(args[batchIdx + 1] ?? "");
	if (!batch?.linkedPrNumber) {
		console.error(`Unknown batch id: ${args[batchIdx + 1]}`);
		process.exit(1);
	}
	printBatch(batch, batch.linkedPrNumber);
	if (batch.productPrNumber != null) {
		printBatch(batch, batch.productPrNumber);
	}
	process.exit(0);
}

console.error(
	"Usage: pnpm npo:batch-pr-body --pr <number> | --batch s02-b1 | --all",
);
process.exit(1);

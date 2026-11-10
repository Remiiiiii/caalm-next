#!/usr/bin/env tsx
/**
 * Insert linkedPrNumber into pto-pr-batches.ts from pr-catalog-bodies/pto/linked-pr-numbers.json
 */

import fs from "node:fs";
import path from "node:path";
import {
	PTO_PR_BATCHES,
	ptoBatchFileId,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

const map = JSON.parse(
	fs.readFileSync(
		path.join(process.cwd(), "pr-catalog-bodies/pto/linked-pr-numbers.json"),
		"utf8",
	),
) as Record<string, number>;

const filePath = path.join(
	process.cwd(),
	"src/lib/roadmap/production-tools/pto-pr-batches.ts",
);
let src = fs.readFileSync(filePath, "utf8");

for (const batch of PTO_PR_BATCHES) {
	const id = ptoBatchFileId(batch);
	const prNumber = map[id];
	if (prNumber == null) continue;

	const secTag = `sectionNumber: ${batch.sectionNumber},`;
	let searchFrom = 0;
	let patched = false;

	while (!patched) {
		const secIdx = src.indexOf(secTag, searchFrom);
		if (secIdx < 0) {
			throw new Error(`No section ${batch.sectionNumber} for ${id}`);
		}
		const batchTag = `batch: ${batch.batch},`;
		const batchIdx = src.indexOf(batchTag, secIdx);
		const nextSecIdx = src.indexOf(secTag, secIdx + secTag.length);
		if (
			batchIdx < 0 ||
			(nextSecIdx >= 0 && batchIdx > nextSecIdx) ||
			batchIdx - secIdx > 400
		) {
			searchFrom = secIdx + secTag.length;
			continue;
		}

		const closeIdx = src.indexOf("\t},", batchIdx);
		if (closeIdx < 0) {
			throw new Error(`No block end for ${id}`);
		}
		const block = src.slice(secIdx, closeIdx);
		if (block.includes("linkedPrNumber:")) {
			patched = true;
			break;
		}
		src =
			src.slice(0, closeIdx) +
			`\n\t\tlinkedPrNumber: ${prNumber},` +
			src.slice(closeIdx);
		patched = true;
	}
}

fs.writeFileSync(filePath, src);
console.log("Updated pto-pr-batches.ts");

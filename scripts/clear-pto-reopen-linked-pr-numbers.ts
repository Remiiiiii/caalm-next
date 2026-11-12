#!/usr/bin/env tsx
/**
 * Remove linkedPrNumber from PTO batches that need a new draft PR after a merged setup stub.
 * Keeps linkedPrNumber for ids present in pr-catalog-bodies/pto/linked-pr-numbers.json.
 */

import fs from "node:fs";
import path from "node:path";
import {
	PTO_PR_BATCHES,
	ptoBatchFileId,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

const keep = new Set(
	Object.keys(
		JSON.parse(
			fs.readFileSync(
				path.join(
					process.cwd(),
					"pr-catalog-bodies/pto/linked-pr-numbers.json",
				),
				"utf8",
			),
		) as Record<string, number>,
	),
);

const filePath = path.join(
	process.cwd(),
	"src/lib/roadmap/production-tools/pto-pr-batches.ts",
);
let src = fs.readFileSync(filePath, "utf8");

for (const batch of PTO_PR_BATCHES) {
	const id = ptoBatchFileId(batch);
	if (keep.has(id)) continue;
	if (batch.mergedSetupPrNumber == null) continue;

	const secTag = `sectionNumber: ${batch.sectionNumber},`;
	let searchFrom = 0;
	let patched = false;

	while (!patched) {
		const secIdx = src.indexOf(secTag, searchFrom);
		if (secIdx < 0) break;
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
		if (closeIdx < 0) break;
		const block = src.slice(secIdx, closeIdx);
		if (block.includes("linkedPrNumber:")) {
			const updated = block.replace(/\n\t\tlinkedPrNumber:\s*\d+,?/g, "");
			src = src.slice(0, secIdx) + updated + src.slice(closeIdx);
		}
		patched = true;
	}
}

fs.writeFileSync(filePath, src);
console.log("Cleared linkedPrNumber for batches pending new draft PRs");

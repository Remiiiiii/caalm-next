#!/usr/bin/env tsx
/**
 * Set mergedSetupPrNumber on PTO batches from pr-catalog-bodies/pto/merged-setup-pr-numbers.json.
 * Does not change linkedPrNumber (use linked-pr-numbers.json + apply-pto-linked-pr-numbers.ts).
 */

import fs from "node:fs";
import path from "node:path";
import {
	PTO_PR_BATCHES,
	ptoBatchFileId,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

const map = JSON.parse(
	fs.readFileSync(
		path.join(
			process.cwd(),
			"pr-catalog-bodies/pto/merged-setup-pr-numbers.json",
		),
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
	const setupPr = map[id];
	if (setupPr == null) continue;

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
		let block = src.slice(secIdx, closeIdx);

		block = block.replace(/\n\t\tmergedSetupPrNumber:\s*\d+,?/g, "");
		if (!block.includes("mergedSetupPrNumber:")) {
			block =
				block.trimEnd() + `\n\t\tmergedSetupPrNumber: ${setupPr},`;
		}

		src = src.slice(0, secIdx) + block + src.slice(closeIdx);
		patched = true;
	}
}

fs.writeFileSync(filePath, src);
console.log("Updated mergedSetupPrNumber in pto-pr-batches.ts");

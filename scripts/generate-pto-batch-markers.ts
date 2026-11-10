#!/usr/bin/env tsx
/**
 * Generate src/lib/roadmap/pto-batches/sNN-bN.ts marker files from pto-pr-batches.ts.
 * Skips files that already exist unless --force.
 */

import fs from "node:fs";
import path from "node:path";
import {
	PTO_PR_BATCHES,
	ptoBatchFileId,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

const force = process.argv.includes("--force");
const outDir = path.join(process.cwd(), "src/lib/roadmap/pto-batches");
fs.mkdirSync(outDir, { recursive: true });

for (const batch of PTO_PR_BATCHES) {
	if (batch.sectionNumber === 0) continue;
	const fileId = ptoBatchFileId(batch);
	const dest = path.join(outDir, `${fileId}.ts`);
	if (fs.existsSync(dest) && !force) {
		continue;
	}

	const relPath = `src/lib/roadmap/pto-batches/${fileId}.ts`;
	const section = String(batch.sectionNumber).padStart(2, "0");
	const exportName = `PTO_BATCH_S${section}_B${batch.batch}`;

	const taskLines = batch.taskCodes
		.map((code, i) => {
			const title = batch.taskTitles[i] ?? code;
			const safeTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
			return `\t\t{ taskCode: "${code}", title: "${safeTitle}" },`;
		})
		.join("\n");

	const contents = `/**
 * Production Tools batch ticket — implement all tasks on this PR branch.
 * Section ${batch.sectionNumber} batch ${batch.batch}: ${batch.sectionTitle}
 */
export const ${exportName} = {
\tsectionNumber: ${batch.sectionNumber},
\tsectionTitle: ${JSON.stringify(batch.sectionTitle)},
\tbatch: ${batch.batch},
\tmarkerPath: ${JSON.stringify(relPath)},
\tbatchTicket: true,
\ttasks: [
${taskLines}
\t],
} as const;
`;

	fs.writeFileSync(dest, contents);
	console.log("wrote", relPath);
}

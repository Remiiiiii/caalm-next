#!/usr/bin/env tsx
/**
 * Open draft GitHub PRs for PTO batches that have no linkedPrNumber yet.
 * Writes missing batch markers, pushes batch branches, updates pto-pr-batches.ts.
 *
 *   pnpm pto:open-batch-prs
 *   pnpm pto:open-batch-prs --dry-run
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	buildPtoBatchPrBody,
	buildPtoBatchPrBodyDraft,
	ptoBatchPullRequestTitleDraft,
} from "../src/lib/roadmap/production-tools/pto-batch-pr-body";
import {
	PTO_PR_BATCHES,
	ptoBatchBranchName,
	ptoBatchFileId,
	type PtoPrBatch,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

const dryRun = process.argv.includes("--dry-run");

function batchesNeedingStub(): PtoPrBatch[] {
	return PTO_PR_BATCHES.filter(
		(b) => b.sectionNumber > 0 && b.linkedPrNumber == null,
	);
}

function sh(cmd: string): string {
	if (dryRun) {
		console.log("[dry-run]", cmd);
		return "https://github.com/Remiiiiii/caalm-next/pull/999";
	}
	return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
}

function createDraftPr(batch: PtoPrBatch): number {
	const branch = ptoBatchBranchName(batch);
	const title = ptoBatchPullRequestTitleDraft(batch);
	const body = buildPtoBatchPrBodyDraft(batch);

	const bodyFile = path.join(
		os.tmpdir(),
		`pto-batch-${ptoBatchFileId(batch)}.md`,
	);
	fs.writeFileSync(bodyFile, body);

	sh(`git push -u origin HEAD:${branch}`);
	const out = sh(
		`gh pr create --draft --base main --head ${branch} --title ${JSON.stringify(title)} --body-file ${JSON.stringify(bodyFile)}`,
	);
	const match = out.trim().match(/pull\/(\d+)\b/);
	if (!match) {
		throw new Error(`Could not parse PR number from: ${out}`);
	}
	const prNumber = Number(match[1]);
	const finalBody = buildPtoBatchPrBody(batch, { forPrNumber: prNumber });
	fs.writeFileSync(bodyFile, finalBody);
	sh(`gh pr edit ${prNumber} --body-file ${JSON.stringify(bodyFile)}`);
	fs.unlinkSync(bodyFile);
	console.log(`Opened draft PR #${prNumber} — ${title}`);
	return prNumber;
}

function updateLinkedPrNumbers(linked: Map<string, number>) {
	const file = path.join(
		process.cwd(),
		"src/lib/roadmap/production-tools/pto-pr-batches.ts",
	);
	let src = fs.readFileSync(file, "utf8");

	for (const [key, prNumber] of linked) {
		const [sectionNumber, batchNum] = key.split(":").map(Number);
		const batch = PTO_PR_BATCHES.find(
			(b) => b.sectionNumber === sectionNumber && b.batch === batchNum,
		);
		if (!batch) continue;
		const lastTitle = batch.taskTitles[batch.taskTitles.length - 1] ?? "";
		const escapedTitle = lastTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const pattern = new RegExp(
			`(sectionNumber: ${sectionNumber},\\s+batch: ${batchNum},[\\s\\S]*?"${escapedTitle}",\\s+\\],)(\\n\\t\\},)`,
			"m",
		);
		if (!pattern.test(src)) {
			throw new Error(
				`Could not patch linkedPrNumber for S${sectionNumber} B${batchNum}`,
			);
		}
		src = src.replace(pattern, `$1\n\t\tlinkedPrNumber: ${prNumber},$2`);
	}

	fs.writeFileSync(file, src);
}

execSync("pnpm exec tsx scripts/generate-pto-batch-markers.ts", {
	stdio: "inherit",
});

const targets = batchesNeedingStub();
if (targets.length === 0) {
	console.log("No PTO batches need draft PRs.");
	process.exit(0);
}

console.log(
	`Opening ${targets.length} draft PR(s):`,
	targets.map((b) => `S${b.sectionNumber} B${b.batch}`).join(", "),
);

const linked = new Map<string, number>();
for (const batch of targets) {
	const key = `${batch.sectionNumber}:${batch.batch}`;
	try {
		linked.set(key, createDraftPr(batch));
	} catch (err) {
		console.error(`Failed S${batch.sectionNumber} B${batch.batch}:`, err);
		process.exitCode = 1;
	}
}

if (!dryRun && linked.size > 0) {
	updateLinkedPrNumbers(linked);
	console.log(`Updated pto-pr-batches.ts with ${linked.size} linkedPrNumber(s).`);
}

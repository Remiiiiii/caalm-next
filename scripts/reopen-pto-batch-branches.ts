#!/usr/bin/env tsx
/**
 * One commit per batch branch so draft PRs differ from main (reopen marker).
 * Run from main or any branch; does not touch catalog PR batches table.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
	PTO_PR_BATCHES,
	ptoBatchBranchName,
	ptoBatchFileId,
} from "../src/lib/roadmap/production-tools/pto-pr-batches";

const setup = JSON.parse(
	fs.readFileSync(
		path.join(
			process.cwd(),
			"pr-catalog-bodies/pto/merged-setup-pr-numbers.json",
		),
		"utf8",
	),
) as Record<string, number>;

const dryRun = process.argv.includes("--dry-run");

function sh(cmd: string) {
	if (dryRun) {
		console.log("[dry-run]", cmd);
		return;
	}
	execSync(cmd, { stdio: "inherit" });
}

const targets = PTO_PR_BATCHES.filter(
	(b) => b.mergedSetupPrNumber != null && b.linkedPrNumber == null,
);

for (const batch of targets) {
	const id = ptoBatchFileId(batch);
	const branch = ptoBatchBranchName(batch);
	const setupPr = setup[id];
	if (setupPr == null) {
		throw new Error(`No merged setup PR for ${id}`);
	}
	const marker = path.join(process.cwd(), `src/lib/roadmap/pto-batches/${id}.ts`);
	const line = `// Reopened implementation draft (merged setup stub #${setupPr} does not complete tasks).`;
	let text = fs.readFileSync(marker, "utf8");
	if (!text.includes("Reopened implementation draft")) {
		text = text.replace(/^/, `${line}\n`);
	}
	fs.writeFileSync(marker, text);
	sh(`git checkout -B ${branch} main`);
	sh(`git add ${marker}`);
	sh(`git commit -m "PTO: reopen batch draft after merged setup stub #${setupPr}"`);
	sh(`git push -u origin ${branch}`);
}

sh("git checkout -");

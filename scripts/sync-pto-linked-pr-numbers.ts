#!/usr/bin/env tsx
/**
 * Map pr-catalog-bodies/pto batch ids → open PR numbers by head branch.
 * Uses `gh api` (read-only for this integration).
 *
 *   pnpm exec tsx scripts/sync-pto-linked-pr-numbers.ts
 *   pnpm exec tsx scripts/sync-pto-linked-pr-numbers.ts --write
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const catalogDir = path.join(process.cwd(), "pr-catalog-bodies/pto");
const outFile = path.join(catalogDir, "linked-pr-numbers.json");
const write = process.argv.includes("--write");

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg?.slice("--only=".length).split(",").filter(Boolean);

const ids = (
	only?.length
		? only
		: fs
				.readdirSync(catalogDir)
				.filter((f) => f.endsWith(".meta.json"))
				.map((f) => f.replace(/\.meta\.json$/, ""))
).sort();

const linked: Record<string, number> = {};

for (const id of ids) {
	const meta = JSON.parse(
		fs.readFileSync(path.join(catalogDir, `${id}.meta.json`), "utf8"),
	) as { branch: string };
	const head = `Remiiiiii:${meta.branch}`;
	const raw = execSync(
		`gh api ${JSON.stringify(`repos/Remiiiiii/caalm-next/pulls?head=${head}&state=open`)}`,
		{ encoding: "utf8" },
	);
	const pulls = JSON.parse(raw) as Array<{ number: number }>;
	if (pulls.length === 1) {
		linked[id] = pulls[0].number;
	} else if (pulls.length > 1) {
		throw new Error(`Multiple open PRs for ${id} (${meta.branch})`);
	}
}

const json = JSON.stringify(linked, null, 2) + "\n";
if (write) {
	fs.writeFileSync(outFile, json);
	console.log(`Wrote ${Object.keys(linked).length} mapping(s) to ${outFile}`);
} else {
	process.stdout.write(json);
}

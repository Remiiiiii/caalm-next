#!/usr/bin/env node
/**
 * Create gitignored `.env.demo.local` from `.env.demo.example` if missing.
 *
 * Does not overwrite an existing file. After init, replace placeholders with
 * real Appwrite IDs and strong cron secrets (see comments in the example).
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const examplePath = path.join(ROOT, ".env.demo.example");
const localPath = path.join(ROOT, ".env.demo.local");

if (!fs.existsSync(examplePath)) {
	console.error(`[demo:env:init] Missing ${path.basename(examplePath)}`);
	process.exit(1);
}

if (fs.existsSync(localPath)) {
	console.log(
		`[demo:env:init] ${path.basename(localPath)} already exists — left unchanged.`,
	);
	process.exit(0);
}

fs.copyFileSync(examplePath, localPath);
console.log(
	`[demo:env:init] Created ${path.basename(localPath)} from ${path.basename(examplePath)}.`,
);
console.log(
	"[demo:env:init] Fill real Appwrite collection/project IDs and strong CRON_*/SCHEDULER_* secrets, then push with `pnpm sync:vercel-env:apply`.",
);

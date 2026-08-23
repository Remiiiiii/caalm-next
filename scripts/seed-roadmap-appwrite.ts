#!/usr/bin/env tsx
/**
 * Seed roadmap_sections + roadmap_tasks from ROADMAP_CATALOG when tables are empty.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-roadmap-appwrite.ts
 *   pnpm exec tsx scripts/seed-roadmap-appwrite.ts --demo
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(ROOT, ".env.local") });

if (process.argv.includes("--demo")) {
	process.env.NEXT_PUBLIC_APPWRITE_DATABASE = "caalm-demo";
}

process.env.ROADMAP_USE_APPWRITE = "true";

async function main() {
	const { seedRoadmapToAppwriteIfEmpty } = await import(
		"../src/lib/roadmap/store"
	);

	const result = await seedRoadmapToAppwriteIfEmpty();

	if (result.seeded) {
		console.log(
			`Seeded ${result.sectionCount} sections and ${result.taskCount} tasks.`,
		);
	} else {
		console.log("Roadmap tables already had data; no seed needed.");
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

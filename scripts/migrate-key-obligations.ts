/**
 * Backfill contract_obligations from legacy Contracts.keyObligations.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-key-obligations.ts --org-id <id>
 *   pnpm tsx scripts/migrate-key-obligations.ts --org-id <id> --apply --actor-user-id <id>
 *   pnpm tsx scripts/migrate-key-obligations.ts --org-id <id> --apply --demo --actor-user-id <id>
 *
 * Dry-run is the default. --apply writes rows. Legacy keyObligations text is not deleted.
 */

import path from "node:path";
import { config as loadEnv } from "dotenv";

const ROOT = path.resolve(__dirname, "..");
const DEMO_DATABASE_ID = "caalm-demo";

type CliArgs = {
	orgId: string;
	apply: boolean;
	demo: boolean;
	actorUserId?: string;
};

function printHelp(): void {
	console.log(`Migrate keyObligations text arrays into contract_obligations.

Usage:
  pnpm tsx scripts/migrate-key-obligations.ts --org-id <id> [--dry-run]
  pnpm tsx scripts/migrate-key-obligations.ts --org-id <id> --apply --actor-user-id <id>
  pnpm tsx scripts/migrate-key-obligations.ts --org-id <id> --apply --demo --actor-user-id <id>

Flags:
  --org-id <id>          Required. Organization to scan.
  --dry-run              Default. Count planned creates; write nothing.
  --apply                Create missing obligation rows.
  --demo                 Use caalm-demo database (loads .env.demo.local).
  --actor-user-id <id>   Required for --apply (or KEY_OBLIGATIONS_MIGRATION_ACTOR_USER_ID).
`);
}

function parseArgs(argv: string[]): CliArgs {
	if (argv.includes("--help") || argv.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	let orgId = "";
	let apply = false;
	let demo = false;
	let actorUserId: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = argv[i + 1];
		if (arg === "--org-id" && next) {
			orgId = next;
			i++;
		} else if (arg === "--actor-user-id" && next) {
			actorUserId = next;
			i++;
		} else if (arg === "--apply") {
			apply = true;
		} else if (arg === "--demo") {
			demo = true;
		} else if (arg === "--dry-run") {
			// Default; explicit flag is accepted.
		} else {
			console.error(`Unknown argument: ${arg}`);
			printHelp();
			process.exit(1);
		}
	}

	if (!orgId) {
		console.error("--org-id is required");
		printHelp();
		process.exit(1);
	}

	return { orgId, apply, demo, actorUserId };
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const envFile = args.demo ? ".env.demo.local" : ".env.local";
	loadEnv({ path: path.join(ROOT, envFile) });

	if (args.demo) {
		const { assertNotProdDatabaseForDemo } = await import(
			"../src/lib/funding/migrate-key-obligations.service"
		);
		assertNotProdDatabaseForDemo(
			process.env.NEXT_PUBLIC_APPWRITE_DATABASE || "",
		);
		process.env.NEXT_PUBLIC_APPWRITE_DATABASE = DEMO_DATABASE_ID;
	}

	const { appwriteConfig } = await import("../src/lib/appwrite/config");
	if (args.demo) {
		appwriteConfig.databaseId = DEMO_DATABASE_ID;
	}

	const actorUserId =
		args.actorUserId ||
		process.env.KEY_OBLIGATIONS_MIGRATION_ACTOR_USER_ID ||
		"";
	if (args.apply && !actorUserId) {
		console.error(
			"--apply requires --actor-user-id or KEY_OBLIGATIONS_MIGRATION_ACTOR_USER_ID",
		);
		process.exit(1);
	}

	const { migrateKeyObligationsForOrg } = await import(
		"../src/lib/funding/migrate-key-obligations.service"
	);
	const stats = await migrateKeyObligationsForOrg({
		orgId: args.orgId,
		actorUserId: actorUserId || "dry-run",
		dryRun: !args.apply,
	});

	console.log("\n==================================================");
	console.log("keyObligations migration");
	console.log("==================================================");
	console.log(`Mode: ${stats.dryRun ? "dry-run" : "apply"}`);
	console.log(`Org: ${stats.orgId}`);
	console.log(`Contracts scanned: ${stats.contractsScanned}`);
	console.log(`Contracts with legacy text: ${stats.contractsWithLegacy}`);
	console.log(`Legacy entries: ${stats.legacyEntries}`);
	console.log(`Would create: ${stats.wouldCreate}`);
	console.log(`Created: ${stats.created}`);
	console.log(`Skipped (already migrated): ${stats.skipped}`);
	console.log(`Errors: ${stats.errors}`);
	console.log("==================================================");

	if (stats.errors > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Fatal error during keyObligations migration:", error);
	process.exit(1);
});

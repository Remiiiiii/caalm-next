#!/usr/bin/env node
/**
 * Compare local env files vs Vercel (key parity) and optionally push missing keys.
 *
 * Demo uses gitignored `.env.demo.local` for real values. Committed
 * `.env.demo.example` is placeholders-only (key checklist).
 *
 * Usage:
 *   node scripts/sync-vercel-env-parity.mjs
 *   node scripts/sync-vercel-env-parity.mjs --apply
 *   node scripts/sync-vercel-env-parity.mjs --apply --include-empty
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEAM = "remiiiiiis-projects";
const ENVS = ["production", "preview", "development"];

const VERCEL_ONLY_PREFIXES = ["VERCEL_", "TURBO_", "NX_"];

const SYNC_PLAN = {
	"caalm-next": {
		label: "Production (caalm-next)",
		localFile: path.join(ROOT, ".env.local"),
		skipKeys: new Set([
			"VERCEL_OIDC_TOKEN",
			"GOOGLE_APPLICATION_CREDENTIALS",
			"DEMO_OTP_CODE",
			"NEXT_PUBLIC_DEMO_OTP_HINT",
			"DEMO_ORG_TTL_DAYS",
			"PROD_APPWRITE_DATABASE_ID",
			"APP_MODE",
			"NEXT_PUBLIC_APP_MODE",
		]),
	},
	"caalm-demo": {
		label: "Demo (caalm-demo)",
		// Real IDs/secrets (gitignored). Example file is placeholders only.
		localFile: path.join(ROOT, ".env.demo.local"),
		exampleFile: path.join(ROOT, ".env.demo.example"),
		sharedFromLocal: [
			"NEXT_APPWRITE_API_KEY",
			"GOOGLE_API_KEY",
			"GITHUB_APP_ID",
			"GITHUB_APP_PRIVATE_KEY",
			"GITHUB_WEBHOOK_SECRET",
			"GITHUB_INSTALLATION_ID",
			"GITHUB_TICKETS_REPO",
			"CURSOR_API_KEY",
			"NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
		],
		skipKeys: new Set([]),
	},
};

function parseEnvFile(filePath) {
	const env = {};
	if (!fs.existsSync(filePath)) return env;
	for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx === -1) continue;
		const key = trimmed.slice(0, idx).trim();
		if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
		env[key] = unquote(trimmed.slice(idx + 1).trim());
	}
	return env;
}

function runVercel(args, input) {
	const result = spawnSync("npx", ["vercel", ...args], {
		cwd: ROOT,
		input,
		encoding: "utf8",
		shell: process.platform === "win32",
		stdio: ["pipe", "pipe", "pipe"],
	});
	if (result.status !== 0) {
		throw new Error(
			`vercel ${args.join(" ")} failed:\n${(result.stderr || result.stdout || "").trim()}`,
		);
	}
	return result.stdout;
}

function listVercelKeys(project) {
	const output = runVercel([
		"env",
		"ls",
		"production",
		"--project",
		project,
		"--scope",
		TEAM,
		"--json",
	]);
	const parsed = JSON.parse(output);
	return new Set(parsed.envs.map((entry) => entry.key));
}

function unquote(value) {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

function visibilityFlags(key) {
	// NEXT_PUBLIC_* is baked into the browser bundle. Vercel rejects secret
	// visibility for those keys on Production and Preview.
	if (key.startsWith("NEXT_PUBLIC_")) {
		return ["--visibility", "config", "--no-sensitive", "--yes"];
	}
	return ["--yes"];
}

function isVercelManagedKey(key) {
	return VERCEL_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function isPlaceholder(value) {
	const v = value.toLowerCase();
	return (
		v.includes("your_") ||
		v.includes("...") ||
		v.endsWith("_api_key") ||
		v.endsWith("_collection_id") ||
		v.endsWith("_bucket_id") ||
		v.endsWith("_placeholder") ||
		v === "demo_bucket_id" ||
		v === "generate_a_unique_key_for_demo" ||
		v === "github_app_id" ||
		v === "github_app_private_key" ||
		v === "github_webhook_secret" ||
		v === "github_installation_id" ||
		v === "project_id" ||
		v === "prod_appwrite_database_id" ||
		v === "pk_test_..." ||
		v === "owner/repo" ||
		v === "cursor_api_key"
	);
}

/**
 * Prefer real local values. For demo, overlay onto example keys so the
 * checklist stays complete even when `.env.demo.local` is incomplete.
 */
function mergeLocal(plan) {
	const example = plan.exampleFile ? parseEnvFile(plan.exampleFile) : {};
	const local = parseEnvFile(plan.localFile);

	if (plan.exampleFile && !fs.existsSync(plan.localFile)) {
		console.warn(
			`[warn] Missing ${path.basename(plan.localFile)}. Run \`pnpm demo:env:init\` and fill real values. Using example keys only (placeholders will not be pushed).`,
		);
	}

	const base = { ...example, ...local };

	if (!plan.sharedFromLocal) return base;
	const overrides = parseEnvFile(path.join(ROOT, ".env.local"));
	for (const key of plan.sharedFromLocal) {
		if (overrides[key] !== undefined) base[key] = overrides[key];
	}
	return base;
}

function summarizeDiff(project, plan, local, remote) {
	const localKeys = Object.keys(local).filter((key) => !plan.skipKeys.has(key));
	const missingOnVercel = localKeys.filter((key) => !remote.has(key));
	const extraOnVercel = [...remote].filter(
		(key) =>
			!plan.skipKeys.has(key) &&
			!Object.hasOwn(local, key) &&
			!isVercelManagedKey(key),
	);
	return { missingOnVercel, extraOnVercel };
}

const apply = process.argv.includes("--apply");
const includeEmpty = process.argv.includes("--include-empty");

for (const [project, plan] of Object.entries(SYNC_PLAN)) {
	const local = mergeLocal(plan);
	const remote = listVercelKeys(project);
	const { missingOnVercel, extraOnVercel } = summarizeDiff(
		project,
		plan,
		local,
		remote,
	);

	console.log(`\n=== ${plan.label} ===`);
	console.log(`Local file: ${path.basename(plan.localFile)}`);
	if (plan.exampleFile) {
		console.log(`Example checklist: ${path.basename(plan.exampleFile)}`);
	}
	console.log(`Local keys: ${Object.keys(local).length}`);
	console.log(`Vercel keys: ${remote.size}`);
	console.log(`Missing on Vercel: ${missingOnVercel.length}`);
	for (const key of missingOnVercel) console.log(`  + ${key}`);
	console.log(`Extra on Vercel (not in local file): ${extraOnVercel.length}`);
	for (const key of extraOnVercel) console.log(`  - ${key}`);

	if (!apply) continue;

	for (const key of missingOnVercel) {
		const value = local[key];
		if (!value && !includeEmpty) {
			console.log(`  skip ${key} (empty; use --include-empty)`);
			continue;
		}
		if (value && isPlaceholder(value)) {
			console.log(`  skip ${key} (placeholder in local file)`);
			continue;
		}
		for (const env of ENVS) {
			console.log(`  add ${key} -> ${env}`);
			try {
				runVercel(
					[
						"env",
						"add",
						key,
						env,
						"--force",
						"--project",
						project,
						"--scope",
						TEAM,
						...visibilityFlags(key),
					],
					value,
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`  fail ${key} -> ${env}: ${message}`);
			}
		}
	}
}

if (!apply) {
	console.log("\nDry run. Re-run with --apply to push missing keys.\n");
}

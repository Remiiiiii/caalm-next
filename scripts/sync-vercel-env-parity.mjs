#!/usr/bin/env node
/**
 * Compare local env files vs Vercel (key parity) and optionally push missing keys.
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
		localFile: path.join(ROOT, ".env.demo.example"),
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
		env[key] = trimmed.slice(idx + 1).trim();
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

function isVercelManagedKey(key) {
	return VERCEL_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function isPlaceholder(value) {
	return (
		value.includes("your_") ||
		value.includes("...") ||
		value.endsWith("_api_key") ||
		value === "demo_bucket_id" ||
		value === "generate_a_unique_key_for_demo" ||
		value === "github_app_id" ||
		value === "pk_test_..."
	);
}

function mergeLocal(plan) {
	const base = parseEnvFile(plan.localFile);
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
			!Object.prototype.hasOwnProperty.call(local, key) &&
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
				],
				value,
			);
		}
	}
}

if (!apply) {
	console.log("\nDry run. Re-run with --apply to push missing keys.\n");
}

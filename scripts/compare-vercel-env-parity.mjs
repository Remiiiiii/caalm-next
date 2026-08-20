#!/usr/bin/env node
/**
 * Compare local env files vs Vercel project env (keys only).
 * Usage: node scripts/compare-vercel-env-parity.mjs [--project=prod|demo|both]
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEAM = "remiiiiiis-projects";

const TARGETS = {
	prod: {
		vercelProject: "caalm-next",
		localFile: path.join(ROOT, ".env.local"),
		label: "Production (caalm-next)",
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
	demo: {
		vercelProject: "caalm-demo",
		localFile: path.join(ROOT, ".env.demo.example"),
		label: "Demo (caalm-demo)",
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

const VERCEL_ONLY_PREFIXES = ["VERCEL_", "TURBO_", "NX_"];

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

function runVercel(args) {
	const result = spawnSync("npx", ["vercel", ...args], {
		cwd: ROOT,
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
	return new Set(JSON.parse(output).envs.map((entry) => entry.key));
}

function mergeLocal(target) {
	const base = parseEnvFile(target.localFile);
	if (!target.sharedFromLocal) return base;
	const overrides = parseEnvFile(path.join(ROOT, ".env.local"));
	for (const key of target.sharedFromLocal) {
		if (overrides[key] !== undefined) base[key] = overrides[key];
	}
	return base;
}

function isVercelManagedKey(key) {
	return VERCEL_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

const filter =
	process.argv.find((arg) => arg.startsWith("--project="))?.split("=")[1] ||
	"both";
const selected = filter === "both" ? ["prod", "demo"] : [filter];

for (const name of selected) {
	const target = TARGETS[name];
	if (!target) {
		console.error(`Unknown project filter: ${name}`);
		process.exit(1);
	}

	const local = mergeLocal(target);
	const remote = listVercelKeys(target.vercelProject);
	const localKeys = Object.keys(local).filter((key) => !target.skipKeys.has(key));
	const missingOnVercel = localKeys.filter((key) => !remote.has(key));
	const extraOnVercel = [...remote].filter(
		(key) =>
			!target.skipKeys.has(key) &&
			!Object.prototype.hasOwnProperty.call(local, key) &&
			!isVercelManagedKey(key),
	);

	console.log(`\n=== ${target.label} ===`);
	console.log(`Local: ${target.localFile}`);
	console.log(`Vercel project: ${target.vercelProject}`);
	console.log(`Local keys: ${localKeys.length}`);
	console.log(`Vercel keys: ${remote.size}`);
	console.log(`Missing on Vercel: ${missingOnVercel.length}`);
	for (const key of missingOnVercel) console.log(`  + ${key}`);
	console.log(`Extra on Vercel (not in local file): ${extraOnVercel.length}`);
	for (const key of extraOnVercel) console.log(`  - ${key}`);
}

console.log("");

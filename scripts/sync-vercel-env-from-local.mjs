#!/usr/bin/env node
/**
 * Sync missing env vars from .env.local to Vercel (caalm-next).
 *
 * Usage:
 *   node scripts/sync-vercel-env-from-local.mjs           # dry run
 *   node scripts/sync-vercel-env-from-local.mjs --apply   # push to Vercel
 *   node scripts/sync-vercel-env-from-local.mjs --apply --include-empty
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const ENVIRONMENTS = ["production", "preview", "development"];

const SYNC_KEYS = [
	// High priority — collections & infra
	"NEXT_PUBLIC_APPWRITE_LICENSE_DRAFTS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_ASSISTANT_CONVERSATIONS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_ASSISTANT_MESSAGES_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_RUNBOOKS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_CALENDAR_REMINDERS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_CALENDAR_DELEGATIONS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_ESCALATION_RULES_COLLECTION",
	"KV_REST_API_URL",
	"KV_REST_API_TOKEN",
	// Stripe billing
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
	"STRIPE_PRICE_STARTER_MONTHLY",
	"STRIPE_PRICE_STARTER_YEARLY",
	"STRIPE_PRICE_GROWTH_MONTHLY",
	"STRIPE_PRICE_GROWTH_YEARLY",
	"STRIPE_PRICE_ENTERPRISE_MONTHLY",
	"STRIPE_PRICE_ENTERPRISE_YEARLY",
	// Web push
	"VAPID_PUBLIC_KEY",
	"VAPID_PRIVATE_KEY",
	"NEXT_PUBLIC_VAPID_PUBLIC_KEY",
	"VAPID_SUBJECT",
	// Medium priority
	"ELEVENLABS_VOICE_ID",
	"NEXT_PUBLIC_ELEVENLABS_VOICE_ID",
	"NEXT_PUBLIC_SPLINE_SCENE_URL",
	"REPLICATE_MODEL",
	// Enterprise RBAC
	"NEXT_PUBLIC_APPWRITE_ORG_UNITS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_COST_CENTERS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_ORG_UNIT_HISTORY_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_COLLECTION",
	// Runbook alert integrations
	"PAGERDUTY_API_TOKEN",
	"OPSGENIE_API_KEY",
	"RUNBOOKS_WEBHOOK_SECRET",
];

function parseEnvFile(filePath) {
	const env = {};
	if (!fs.existsSync(filePath)) {
		throw new Error(`Missing ${filePath}`);
	}
	for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const idx = trimmed.indexOf("=");
		if (idx === -1) continue;
		const key = trimmed.slice(0, idx).trim();
		const value = trimmed.slice(idx + 1).trim();
		env[key] = value;
	}
	return env;
}

function runVercel(args, input) {
	const isWin = process.platform === "win32";
	const command = isWin ? "pnpm" : "vercel";
	const commandArgs = isWin ? ["exec", "vercel", ...args] : args;

	const result = spawnSync(command, commandArgs, {
		cwd: ROOT,
		input,
		encoding: "utf8",
		shell: isWin,
		stdio: ["pipe", "pipe", "pipe"],
	});

	if (result.error) {
		throw new Error(
			`Failed to run vercel for ${args.join(" ")}: ${result.error.message}`,
		);
	}
	if (result.status !== 0) {
		const detail = (result.stderr || result.stdout || "").trim();
		throw new Error(
			`vercel ${args.join(" ")} failed (exit ${result.status})${detail ? `\n${detail}` : ""}`,
		);
	}

	return result.stdout;
}

function getExistingVercelKeys() {
	const output = runVercel([
		"env",
		"ls",
		"production",
		"--project",
		"caalm-next",
		"--scope",
		"remiiiiiis-projects",
		"--json",
	]);
	return new Set(JSON.parse(output).envs.map((entry) => entry.key));
}

function addVercelEnv(key, value) {
	for (const environment of ENVIRONMENTS) {
		runVercel(["env", "add", key, environment], value);
	}
}

function isPlaceholder(value) {
	return !value || value.includes("...") || value.endsWith("_api_key") || value.endsWith("_token");
}

const apply = process.argv.includes("--apply");
const includeEmpty = process.argv.includes("--include-empty");

if (!fs.existsSync(path.join(ROOT, ".vercel", "project.json"))) {
	console.error(
		"Project not linked. Run: vercel link --project caalm-next --scope remiiiiiis-projects --yes",
	);
	process.exit(1);
}

const localEnv = parseEnvFile(ENV_FILE);
const existing = getExistingVercelKeys();

const toAdd = [];
const skipped = [];

for (const key of SYNC_KEYS) {
	if (existing.has(key)) {
		skipped.push({ key, reason: "already on Vercel" });
		continue;
	}
	const value = localEnv[key];
	if (value === undefined) {
		skipped.push({ key, reason: "missing from .env.local" });
		continue;
	}
	if (!value && !includeEmpty) {
		skipped.push({ key, reason: "empty (use --include-empty to push)" });
		continue;
	}
	if (isPlaceholder(value) && key.includes("STRIPE")) {
		skipped.push({ key, reason: "placeholder value in .env.local" });
		continue;
	}
	toAdd.push({ key, value });
}

console.log(`\nVercel env sync (${apply ? "APPLY" : "DRY RUN"})\n`);
console.log(`Existing on Vercel: ${existing.size}`);
console.log(`To add: ${toAdd.length}`);
console.log(`Skipped: ${skipped.length}\n`);

if (toAdd.length) {
	console.log("Will add:");
	for (const { key } of toAdd) console.log(`  + ${key}`);
	console.log("");
}

if (skipped.length) {
	console.log("Skipped:");
	for (const { key, reason } of skipped) console.log(`  - ${key}: ${reason}`);
	console.log("");
}

if (!apply) {
	console.log("Dry run only. Re-run with --apply to push to Vercel.\n");
	process.exit(0);
}

for (const { key, value } of toAdd) {
	console.log(`Adding ${key} (${ENVIRONMENTS.join(", ")})...`);
	addVercelEnv(key, value);
}

console.log(`\nDone. Added ${toAdd.length} variable(s).\n`);

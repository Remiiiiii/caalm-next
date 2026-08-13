#!/usr/bin/env node
/**
 * Push TicketOps + related Appwrite collection env vars to Vercel (caalm-next).
 * GITHUB_APP_PRIVATE_KEY is sent as Option A (single line with \n).
 *
 * Usage: node scripts/push-ticketops-vercel-env.mjs [--apply]
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const ENVIRONMENTS = process.argv.includes("--all-envs")
	? ["production", "preview", "development"]
	: ["production"];

const KEYS = [
	"TICKETS_ENABLED",
	"GITHUB_APP_ID",
	"GITHUB_APP_PRIVATE_KEY",
	"GITHUB_WEBHOOK_SECRET",
	"GITHUB_INSTALLATION_ID",
	"GITHUB_TICKETS_REPO",
	"CURSOR_API_KEY",
	"NEXT_PUBLIC_APPWRITE_TICKETS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_TICKET_EVENTS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_WEBHOOK_DELIVERIES_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_TICKET_ATTACHMENTS_BUCKET",
	"NEXT_PUBLIC_APPWRITE_ORG_UNITS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_COST_CENTERS_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_ORG_UNIT_HISTORY_COLLECTION",
	"NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_COLLECTION",
];

function parseEnvLocal(content) {
	const env = {};
	const lines = content.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (value.startsWith('"') && !value.endsWith('"')) {
			const block = [value.slice(1)];
			while (i + 1 < lines.length && !lines[i + 1].trim().endsWith('"')) {
				i++;
				block.push(lines[i]);
			}
			if (i + 1 < lines.length) {
				i++;
				block.push(lines[i].trim().replace(/"$/, ""));
			}
			value = block.join("\n");
		} else if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		env[key] = value;
	}
	return env;
}

function toOptionA(pem) {
	return pem.trim().replace(/\r?\n/g, "\\n");
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
	if (result.status !== 0) {
		const detail = (result.stderr || result.stdout || "").trim();
		throw new Error(
			`vercel ${args.join(" ")} failed (exit ${result.status})${detail ? `: ${detail}` : ""}`,
		);
	}
	return result.stdout;
}

function addEnv(key, value, environment) {
	runVercel(["env", "add", key, environment, "--yes", "--force"], value);
}

const apply = process.argv.includes("--apply");
const raw = fs.readFileSync(ENV_FILE, "utf8");
const local = parseEnvLocal(raw);

if (local.GITHUB_APP_PRIVATE_KEY) {
	local.GITHUB_APP_PRIVATE_KEY = toOptionA(local.GITHUB_APP_PRIVATE_KEY);
}

const toPush = KEYS.filter((k) => local[k] !== undefined && local[k] !== "");

console.log(`\nTicketOps Vercel env push (${apply ? "APPLY" : "DRY RUN"})\n`);
for (const key of toPush) {
	const preview =
		key === "GITHUB_APP_PRIVATE_KEY"
			? `${local[key].slice(0, 40)}... (${local[key].length} chars)`
			: local[key].length > 60
				? `${local[key].slice(0, 20)}...`
				: local[key];
	console.log(`  ${key}=${preview}`);
}
console.log(`\nEnvironments: ${ENVIRONMENTS.join(", ")}\n`);

if (!apply) {
	console.log("Dry run. Re-run with --apply to push.\n");
	process.exit(0);
}

for (const key of toPush) {
	for (const environment of ENVIRONMENTS) {
		try {
			console.log(`Adding ${key} → ${environment}...`);
			addEnv(key, local[key], environment);
		} catch (error) {
			console.error(`  FAILED: ${error instanceof Error ? error.message : error}`);
		}
	}
}

console.log(`\nDone. Pushed ${toPush.length} variable(s).\n`);

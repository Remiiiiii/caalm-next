#!/usr/bin/env node
/**
 * Notify production CLM roadmap webhooks after CI passes.
 *
 * - pull_request: POST ci-test-result (cleared-to-merge on PR HEAD)
 * - push to main: POST ci-test-result + pr-merged for merged PR(s)
 *   (merge commit, push event message, and recently merged catalog PRs)
 *
 * Usage:
 *   node scripts/notify-roadmap-ci.mjs
 *   node scripts/notify-roadmap-ci.mjs --backfill --pr 49 --sha <merge-commit>
 *   node scripts/notify-roadmap-ci.mjs --catchup   # re-notify all catalog PRs merged in 45d
 */

import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

loadEnv({ path: path.join(ROOT, ".env.local") });

const APP_URL = (
	process.env.ROADMAP_APP_URL ||
	process.env.NEXT_PUBLIC_APP_URL ||
	"https://www.caalmsolutions.com"
).replace(/\/$/, "");

const SECRET =
	process.env.ROADMAP_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET || "";

const REPO = process.env.GITHUB_REPOSITORY || "";
const EVENT = process.env.GITHUB_EVENT_NAME || "";
const REF = process.env.GITHUB_REF || "";
const SHA = process.env.GITHUB_SHA || "";
const RUN_ID = process.env.GITHUB_RUN_ID || "";
const SERVER_URL = process.env.GITHUB_SERVER_URL || "https://github.com";
const GH_TOKEN = process.env.GITHUB_TOKEN || "";

function resolveGithubRepo() {
	if (REPO) return REPO;
	const configPath = path.join(ROOT, ".git", "config");
	if (!existsSync(configPath)) return "";
	const config = readFileSync(configPath, "utf8");
	const match = config.match(/url\s*=\s*.*github\.com[:/](.+?)(?:\.git)?\s*$/m);
	return match ? match[1].trim() : "";
}

/** Re-notify catalog-linked PRs merged within this window (idempotent on prod). */
const RECENT_MERGE_DAYS = 45;

function sign(body) {
	return `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;
}

function parseArgs(argv) {
	const out = { backfill: false, catchup: false, pr: null, sha: null };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--backfill") out.backfill = true;
		if (argv[i] === "--catchup") out.catchup = true;
		if (argv[i] === "--pr") out.pr = Number(argv[++i]);
		if (argv[i] === "--sha") out.sha = argv[++i];
	}
	return out;
}

function logsUrl() {
	if (REPO && RUN_ID) {
		return `${SERVER_URL}/${REPO}/actions/runs/${RUN_ID}`;
	}
	return `${APP_URL}/dashboard/it/development/clm-roadmap`;
}

function githubHeaders() {
	return {
		Authorization: `Bearer ${GH_TOKEN}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	};
}

const RETRYABLE_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);
const MAX_WEBHOOK_ATTEMPTS = 5;
/** Pause between webhook POSTs so burst traffic stays under rate limits. */
const INTER_WEBHOOK_DELAY_MS = 1500;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableWebhookFailure(status, rawBody) {
	if (RETRYABLE_STATUSES.has(status)) return true;
	return String(rawBody).includes("DEPLOYMENT_NOT_FOUND");
}

function logWebhookHostHint(rawBody) {
	if (String(rawBody).includes("DEPLOYMENT_NOT_FOUND")) {
		console.error(
			"[roadmap] Host returned DEPLOYMENT_NOT_FOUND — ROADMAP_APP_URL may point at a removed Vercel preview. Use the stable production origin (https://www.caalmsolutions.com).",
		);
	}
}

function retryDelayMs(status, json, res, attempt) {
	if (status === 429) {
		const bodyRetry = Number(json?.retryAfter);
		if (Number.isFinite(bodyRetry) && bodyRetry > 0) {
			return bodyRetry * 1000 + 500;
		}
		const headerRetry = Number(res.headers.get("retry-after"));
		if (Number.isFinite(headerRetry) && headerRetry > 0) {
			return headerRetry * 1000 + 500;
		}
		if (json?.resetTime) {
			const wait = new Date(json.resetTime).getTime() - Date.now();
			if (wait > 0) return wait + 500;
		}
		return 65_000;
	}
	return Math.min(30_000, 2 ** (attempt - 1) * 2000);
}

async function postWebhook(path, body) {
	const payload = JSON.stringify(body);
	let lastResult = { ok: false, status: 0, json: {} };

	for (let attempt = 1; attempt <= MAX_WEBHOOK_ATTEMPTS; attempt++) {
		const res = await fetch(`${APP_URL}${path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-hub-signature-256": sign(payload),
			},
			body: payload,
		});
		const text = await res.text();
		let json;
		try {
			json = JSON.parse(text);
		} catch {
			json = { raw: text };
		}
		lastResult = { ok: res.ok, status: res.status, json };

		if (res.ok) return lastResult;

		logWebhookHostHint(text);

		if (!isRetryableWebhookFailure(res.status, text) || attempt === MAX_WEBHOOK_ATTEMPTS) {
			return lastResult;
		}

		const delayMs = retryDelayMs(res.status, json, res, attempt);
		console.warn(
			`[roadmap] ${path} returned ${res.status} — retry ${attempt}/${MAX_WEBHOOK_ATTEMPTS} in ${delayMs}ms`,
		);
		await sleep(delayMs);
	}

	return lastResult;
}

async function notifyCiPassed({ prNumber, commitSha, summary }) {
	return postWebhook("/api/roadmap/webhooks/ci-test-result", {
		prNumber,
		commitSha,
		result: "passed",
		logsUrl: logsUrl(),
		summary: summary || `Playwright E2E passed on ${commitSha.slice(0, 7)}`,
	});
}

async function notifyPrMerged({ prNumber, mergeCommitSha }) {
	return postWebhook("/api/roadmap/webhooks/pr-merged", {
		prNumber,
		mergeCommitSha,
		baseBranch: "main",
		recheckPassed: true,
	});
}

/** PR numbers listed in src/lib/roadmap/catalog.ts linkedPrNumbers arrays. */
function loadCatalogLinkedPrs() {
	const catalogPath = path.join(__dirname, "../src/lib/roadmap/catalog.ts");
	const text = readFileSync(catalogPath, "utf8");
	const prs = new Set();
	for (const match of text.matchAll(/linkedPrNumbers:\s*\[([^\]]+)\]/g)) {
		for (const n of match[1].match(/\d+/g) || []) {
			prs.add(Number(n));
		}
	}
	return [...prs];
}

/** Parse "Merge pull request #49 …" or "Title (#49)" from the push event payload. */
function parsePrNumbersFromPushEvent() {
	const eventPath = process.env.GITHUB_EVENT_PATH;
	if (!eventPath) return [];
	try {
		const event = JSON.parse(readFileSync(eventPath, "utf8"));
		const message = event.head_commit?.message || "";
		const prs = new Set();
		const mergeMatch = message.match(/Merge pull request #(\d+)/i);
		if (mergeMatch) prs.add(Number(mergeMatch[1]));
		const squashMatch = message.match(/\(#(\d+)\)\s*$/m);
		if (squashMatch) prs.add(Number(squashMatch[1]));
		return [...prs];
	} catch {
		return [];
	}
}

async function fetchPullRequest(repo, prNumber) {
	const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
	const res = await fetch(url, { headers: githubHeaders() });
	if (!res.ok) {
		console.warn(`[roadmap] GitHub API ${res.status} for pulls/${prNumber}`);
		return null;
	}
	return res.json();
}

async function fetchMergedPrsForCommit(repo, sha) {
	if (!GH_TOKEN) {
		console.warn("[roadmap] GITHUB_TOKEN missing; cannot resolve PRs for commit");
		return [];
	}
	const url = `https://api.github.com/repos/${repo}/commits/${sha}/pulls`;
	const res = await fetch(url, { headers: githubHeaders() });
	if (!res.ok) {
		console.warn(`[roadmap] GitHub API ${res.status} for commits/${sha}/pulls`);
		return [];
	}
	const pulls = await res.json();
	return pulls
		.filter((pr) => Boolean(pr.merged_at) && pr.merge_commit_sha)
		.map((pr) => ({
			prNumber: pr.number,
			mergeCommitSha: pr.merge_commit_sha,
		}));
}

async function fetchRecentlyMergedCatalogPrs(repo) {
	if (!GH_TOKEN) return [];
	const catalogPrs = loadCatalogLinkedPrs();
	const cutoff = Date.now() - RECENT_MERGE_DAYS * 86_400_000;
	const targets = [];

	for (const prNumber of catalogPrs) {
		const pr = await fetchPullRequest(repo, prNumber);
		if (!pr?.merged_at || !pr.merge_commit_sha) continue;
		if (new Date(pr.merged_at).getTime() < cutoff) continue;
		targets.push({
			prNumber,
			mergeCommitSha: pr.merge_commit_sha,
		});
	}

	return targets;
}

function dedupePrTargets(targets) {
	const byPr = new Map();
	for (const target of targets) {
		byPr.set(target.prNumber, target);
	}
	return [...byPr.values()];
}

async function resolvePrTargetsForMainPush(repo, sha, { includeCatalogCatchup = false } = {}) {
	const fromCommit = await fetchMergedPrsForCommit(repo, sha);
	const fromEvent = parsePrNumbersFromPushEvent();

	const eventTargets = [];
	for (const prNumber of fromEvent) {
		const pr = await fetchPullRequest(repo, prNumber);
		if (pr?.merged_at && pr.merge_commit_sha) {
			eventTargets.push({
				prNumber,
				mergeCommitSha: pr.merge_commit_sha,
			});
		} else {
			// PR still open on this push — use HEAD sha for ci-test-result only path
			eventTargets.push({ prNumber, mergeCommitSha: sha });
		}
	}

	// Merge-commit pushes: associate current SHA when GitHub omits merge_commit_sha
	const commitTargets = fromCommit.map((t) => ({
		prNumber: t.prNumber,
		mergeCommitSha: t.mergeCommitSha || sha,
	}));

	const targets = dedupePrTargets([...commitTargets, ...eventTargets]);

	if (!includeCatalogCatchup) {
		return targets;
	}

	const fromCatalog = await fetchRecentlyMergedCatalogPrs(repo);
	return dedupePrTargets([...targets, ...fromCatalog]);
}

async function notifyRoadmapForPr({ prNumber, commitSha, summary }) {
	console.log(`[roadmap] Notify PR #${prNumber} @ ${commitSha.slice(0, 7)}`);
	const ci = await notifyCiPassed({
		prNumber,
		commitSha,
		summary: summary || `Playwright E2E passed on ${commitSha.slice(0, 7)}`,
	});
	console.log("[roadmap] ci-test-result:", ci.status, JSON.stringify(ci.json));
	await sleep(INTER_WEBHOOK_DELAY_MS);
	const merge = await notifyPrMerged({
		prNumber,
		mergeCommitSha: commitSha,
	});
	console.log("[roadmap] pr-merged:", merge.status, JSON.stringify(merge.json));
	if (!ci.ok || !merge.ok) process.exit(1);
}

async function runCatchup() {
	const repo = resolveGithubRepo();
	if (!repo) {
		console.error(
			"[roadmap] Set GITHUB_REPOSITORY or run from a clone with a GitHub origin remote",
		);
		process.exit(1);
	}
	if (!GH_TOKEN) {
		console.error("[roadmap] GITHUB_TOKEN missing — needed to look up merged PRs");
		process.exit(1);
	}

	const targets = await fetchRecentlyMergedCatalogPrs(repo);
	if (!targets.length) {
		console.log("[roadmap] No recently merged catalog PRs found");
		return;
	}

	console.log(`[roadmap] Catch-up: ${targets.length} merged catalog PR(s) in ${repo}`);
	for (let i = 0; i < targets.length; i++) {
		const { prNumber, mergeCommitSha } = targets[i];
		await notifyRoadmapForPr({
			prNumber,
			commitSha: mergeCommitSha,
			summary: "Manual catch-up: merged catalog PR",
		});
		if (i < targets.length - 1) {
			await sleep(INTER_WEBHOOK_DELAY_MS);
		}
	}
}

async function runBackfill({ pr, sha }) {
	if (!pr || !sha) {
		console.error("[roadmap] --backfill requires --pr and --sha");
		process.exit(1);
	}
	console.log(`[roadmap] Backfill PR #${pr} @ ${sha}`);
	await notifyRoadmapForPr({
		prNumber: pr,
		commitSha: sha,
		summary: "Manual backfill: Playwright E2E passed",
	});
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (!SECRET) {
		const msg =
			"[roadmap] ROADMAP_WEBHOOK_SECRET not set — skipping roadmap notifications";
		if (REF === "refs/heads/main" && EVENT === "push") {
			console.error(`${msg} (required on main push)`);
			process.exit(1);
		}
		console.log(msg);
		return;
	}

	if (args.backfill) {
		await runBackfill(args);
		return;
	}

	if (args.catchup) {
		await runCatchup();
		return;
	}

	const prFromEvent = Number(process.env.GITHUB_PR_NUMBER || 0) || null;
	const headSha = process.env.GITHUB_PR_HEAD_SHA || SHA;

	if (EVENT === "pull_request" && prFromEvent) {
		console.log(`[roadmap] PR #${prFromEvent} CI passed @ ${headSha}`);
		const ci = await notifyCiPassed({
			prNumber: prFromEvent,
			commitSha: headSha,
		});
		console.log("[roadmap] ci-test-result:", ci.status, JSON.stringify(ci.json));
		if (!ci.ok) process.exit(1);
		return;
	}

	if (EVENT === "push" && REF === "refs/heads/main" && REPO && SHA) {
		const includeCatalogCatchup =
			args.catchup || process.env.ROADMAP_CATCHUP === "true";
		const targets = await resolvePrTargetsForMainPush(REPO, SHA, {
			includeCatalogCatchup,
		});
		if (!targets.length) {
			console.log(
				"[roadmap] No merged catalog/PR targets for main push — nothing to notify",
			);
			return;
		}
		for (let i = 0; i < targets.length; i++) {
			const { prNumber, mergeCommitSha } = targets[i];
			await notifyRoadmapForPr({
				prNumber,
				commitSha: mergeCommitSha,
				summary: "Playwright E2E passed on main (CI + deploy pipeline)",
			});
			if (i < targets.length - 1) {
				await sleep(INTER_WEBHOOK_DELAY_MS);
			}
		}
		return;
	}

	console.log(
		`[roadmap] Skipped (event=${EVENT}, ref=${REF}) — only pull_request and push→main notify`,
	);
}

main().catch((err) => {
	console.error("[roadmap] notify failed:", err);
	process.exit(1);
});

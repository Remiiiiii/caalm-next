#!/usr/bin/env node
/**
 * Notify production CLM roadmap webhooks after CI passes.
 *
 * - pull_request: POST ci-test-result (cleared-to-merge on PR HEAD)
 * - push to main: POST ci-test-result + pr-merged for merged PR(s) on GITHUB_SHA
 *
 * Usage:
 *   node scripts/notify-roadmap-ci.mjs
 *   node scripts/notify-roadmap-ci.mjs --backfill --pr 49 --sha <merge-commit>
 */

import { createHmac } from "node:crypto";

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

function sign(body) {
	return `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;
}

function parseArgs(argv) {
	const out = { backfill: false, pr: null, sha: null };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--backfill") out.backfill = true;
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

async function postWebhook(path, body) {
	const payload = JSON.stringify(body);
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
	return { ok: res.ok, status: res.status, json };
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

async function fetchMergedPrsForCommit(repo, sha) {
	if (!GH_TOKEN) {
		console.warn("[roadmap] GITHUB_TOKEN missing; cannot resolve PRs for commit");
		return [];
	}
	const url = `https://api.github.com/repos/${repo}/commits/${sha}/pulls`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${GH_TOKEN}`,
			Accept: "application/vnd.github+json",
		},
	});
	if (!res.ok) {
		console.warn(`[roadmap] GitHub API ${res.status} for commits/${sha}/pulls`);
		return [];
	}
	const pulls = await res.json();
	return pulls.filter((pr) => Boolean(pr.merged_at)).map((pr) => pr.number);
}

async function runBackfill({ pr, sha }) {
	if (!pr || !sha) {
		console.error("[roadmap] --backfill requires --pr and --sha");
		process.exit(1);
	}
	console.log(`[roadmap] Backfill PR #${pr} @ ${sha}`);
	const ci = await notifyCiPassed({
		prNumber: pr,
		commitSha: sha,
		summary: "Manual backfill: Playwright E2E passed",
	});
	console.log("[roadmap] ci-test-result:", ci.status, JSON.stringify(ci.json));
	const merge = await notifyPrMerged({ prNumber: pr, mergeCommitSha: sha });
	console.log("[roadmap] pr-merged:", merge.status, JSON.stringify(merge.json));
	if (!ci.ok || !merge.ok) process.exit(1);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (!SECRET) {
		console.log(
			"[roadmap] ROADMAP_WEBHOOK_SECRET not set — skipping roadmap notifications",
		);
		return;
	}

	if (args.backfill) {
		await runBackfill(args);
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
		const prNumbers = await fetchMergedPrsForCommit(REPO, SHA);
		if (!prNumbers.length) {
			console.log("[roadmap] No merged PR linked to main push — nothing to notify");
			return;
		}
		for (const prNumber of prNumbers) {
			console.log(`[roadmap] Main push: PR #${prNumber} @ ${SHA}`);
			const ci = await notifyCiPassed({
				prNumber,
				commitSha: SHA,
				summary: "Playwright E2E passed on merge commit (main)",
			});
			console.log(
				"[roadmap] ci-test-result:",
				ci.status,
				JSON.stringify(ci.json),
			);
			const merge = await notifyPrMerged({
				prNumber,
				mergeCommitSha: SHA,
			});
			console.log(
				"[roadmap] pr-merged:",
				merge.status,
				JSON.stringify(merge.json),
			);
			if (!ci.ok || !merge.ok) process.exit(1);
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

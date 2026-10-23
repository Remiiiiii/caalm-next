#!/usr/bin/env node
// Consolidated PreToolUse guard for Write/Edit/MultiEdit: mechanically-checkable
// (zero-judgment, literal/structural) rules from .cursor/rules/*.mdc. Each check
// is a pure pattern match — no semantic/LLM judgment, so no false positives from
// "this looks sketchy" guessing. First violation found blocks; no match allows.
//
// Deliberately NOT covered here (needs semantic understanding, not pattern
// matching — a regex block would just produce false positives):
//   - security-rbac.mdc / api-route-authz.mdc role-bypass patterns
//   - audit-narrative.mdc "leave an audit story" / "no fake success audits"
//   - desktop-first.mdc companion-route judgment calls
//   - ai-document-extraction.mdc "human in the loop" behavior
//   - plain-english-junior-dev.mdc / roadmap-pr-journey.mdc (about chat
//     response text, not a tool-call artifact — no hook sees that)

let input = "";
process.stdin.on("data", (c) => {
	input += c;
});
process.stdin.on("end", () => {
	try {
		const payload = JSON.parse(input || "{}");
		const toolName = payload.tool_name || "";
		const ti = payload.tool_input || {};

		if (!["Write", "Edit", "MultiEdit"].includes(toolName)) {
			process.exit(0);
		}

		const filePath = (ti.file_path || "").replace(/\\/g, "/");

		const addedText =
			toolName === "Write"
				? ti.content || ""
				: toolName === "Edit"
					? ti.new_string || ""
					: Array.isArray(ti.edits)
						? ti.edits.map((e) => e.new_string || "").join("\n")
						: "";

		const deny = (reason) => {
			console.log(
				JSON.stringify({
					hookSpecificOutput: {
						hookEventName: "PreToolUse",
						permissionDecision: "deny",
						permissionDecisionReason: reason,
					},
				}),
			);
			process.exit(0);
		};

		// plan-prompt-templates.mdc: never edit the template library on disk —
		// brackets are filled in memory only.
		if (/\.cursor\/prompt-templates\//.test(filePath)) {
			return deny(
				"Blocked: .cursor/prompt-templates/*.md must never be edited, rewritten, or committed to — fill brackets in memory only, per .cursor/rules/plan-prompt-templates.mdc.",
			);
		}

		// api-route-authz.mdc: never hand-edit the baseline to hide an unguarded route.
		if (/(^|\/)api-authz-baseline\.json$/.test(filePath)) {
			return deny(
				"Blocked: do not hand-edit api-authz-baseline.json to hide a newly unguarded route — fix the route's requirePermission gate instead. See .cursor/rules/api-route-authz.mdc.",
			);
		}

		// caalm-demo-database-sync.mdc: never point a demo env file at the prod DB id.
		if (/\.env\.demo(\.(local|example))?$/.test(filePath)) {
			if (addedText.includes("685ed87c0009d8189fc7")) {
				return deny(
					"Blocked: never point caalm-demo env vars at the production database id 685ed87c0009d8189fc7. See .cursor/rules/caalm-demo-database-sync.mdc.",
				);
			}
		}

		// env-example-placeholders.mdc: no secret-shaped values in example env files.
		if (/\.env(\.demo)?\.example$/.test(filePath)) {
			const secretChecks = [
				{
					re: /=\s*"?[0-9a-f]{20,24}"?\s*(\r?\n|$)/im,
					why: "an Appwrite-style alphanumeric $id",
				},
				{ re: /standard_[A-Za-z0-9]{15,}/, why: "a live Appwrite API key" },
				{ re: /sk_live_[A-Za-z0-9]+/, why: "a live Stripe secret key" },
				{ re: /pk_live_[A-Za-z0-9]+/, why: "a live Stripe publishable key" },
			];
			for (const { re, why } of secretChecks) {
				const match = addedText.match(re);
				if (match) {
					return deny(
						`Blocked: .env.example/.env.demo.example must stay placeholders only — "${match[0].trim()}" looks like ${why}. See .cursor/rules/env-example-placeholders.mdc.`,
					);
				}
			}
		}

		// global-style-guide.mdc: banned intermediate Tailwind shades on CAALM
		// custom colors (use opacity syntax instead, e.g. bg-red/10).
		if (/\.(tsx|ts|css)$/.test(filePath) && !filePath.includes("node_modules")) {
			const badShade = addedText.match(
				/\b(bg|text|border)-(red|green|blue|pink|orange|brand|navy|coral)-(100|200|300|400|500|600|700|800|900)\b/,
			);
			if (badShade) {
				return deny(
					`Blocked: '${badShade[0]}' uses an intermediate Tailwind shade on a CAALM custom color. Use opacity syntax instead (e.g. ${badShade[1]}-${badShade[2]}/10). See .cursor/rules/global-style-guide.mdc.`,
				);
			}

			// window.confirm() is explicitly banned as dialog chrome.
			if (/\bwindow\.confirm\s*\(/.test(addedText)) {
				return deny(
					"Blocked: window.confirm() is banned — use ConfirmDialog (confirms/destructive) or AppDialog (forms). See .cursor/rules/global-style-guide.mdc.",
				);
			}

			// Overflow (3-dot) menus must use dots.svg, not Lucide MoreVertical/EllipsisVertical.
			if (/\b(MoreVertical|EllipsisVertical)\b/.test(addedText)) {
				return deny(
					"Blocked: row/card overflow menus use the dots.svg trigger (ActionDropdown pattern), not Lucide MoreVertical/EllipsisVertical. See .cursor/rules/global-style-guide.mdc.",
				);
			}
		}

		// no-workflow-engine-sprawl.mdc: block hand-editing package.json to add
		// a second workflow/orchestration engine (the Bash `pnpm add` path is
		// covered separately by bash-rule-guard.cjs).
		if (/(^|\/)package\.json$/.test(filePath)) {
			const bannedPackages = [
				/"@temporalio\/[\w-]+"/i,
				/"temporalio"/i,
				/"temporal-client"/i,
				/"camunda[\w-]*"/i,
				/"zeebe[\w-]*"/i,
				/"cadence-client"/i,
				/"@io-orkes\/conductor-javascript"/i,
				/"kafkajs"/i,
				/"node-rdkafka"/i,
				/"@confluentinc\/kafka-javascript"/i,
			];
			for (const re of bannedPackages) {
				const match = addedText.match(re);
				if (match) {
					return deny(
						`Blocked: adding ${match[0]} to package.json looks like a second workflow/orchestration engine (Temporal/Camunda/Cadence/Conductor/Kafka). See .cursor/rules/no-workflow-engine-sprawl.mdc.`,
					);
				}
			}
		}

		// media-hosting.mdc: retired Vercel Blob store — don't point new code at it.
		if (
			/\.(tsx|ts)$/.test(filePath) &&
			/\.blob\.vercel-storage\.com/.test(addedText)
		) {
			return deny(
				"Blocked: *.blob.vercel-storage.com is retired for runtime reads (Hobby Blob Data Transfer cap). See .cursor/rules/media-hosting.mdc for the current media hosting approach.",
			);
		}

		// media-hosting.mdc: no new wave-video backgrounds on authenticated
		// (root) pages — video stays on marketing routes only.
		if (
			/\/\(root\)\//.test(filePath) &&
			/\.(tsx|ts)$/.test(filePath) &&
			/MEDIA_URLS\.waveVideo/.test(addedText)
		) {
			return deny(
				"Blocked: do not add MEDIA_URLS.waveVideo backgrounds on (root) (authenticated) pages — use StaticWaveBackdrop there instead. See .cursor/rules/media-hosting.mdc.",
			);
		}

		// context-dev.mdc: never call the Context.dev REST API directly from a
		// client component — CONTEXT_DEV_API_KEY is server-only.
		if (
			/\.(tsx|ts)$/.test(filePath) &&
			addedText.includes("api.context.dev")
		) {
			let isClientComponent =
				addedText.includes('"use client"') || addedText.includes("'use client'");
			if (!isClientComponent && toolName !== "Write") {
				try {
					const existing = require("node:fs").readFileSync(filePath, "utf8");
					isClientComponent = /^\s*["']use client["'];?/m.test(existing);
				} catch {
					// file unreadable (new file, race) — fall back to addedText-only check
				}
			}
			if (isClientComponent) {
				return deny(
					"Blocked: api.context.dev must only be called server-side (CONTEXT_DEV_API_KEY is a server secret) — this file is a client component ('use client'). Route it through a server-side wrapper instead. See .cursor/rules/context-dev.mdc.",
				);
			}
		}

		// writing.mdc: banned words/phrases in product/marketing copy files.
		if (
			/\/(docs|src\/content|public)\//.test(filePath) &&
			/\.(md|mdx|tsx|ts)$/.test(filePath)
		) {
			const banned = [
				"a bit",
				"a little",
				"arguably",
				"battle tested",
				"best practices",
				"blazing fast",
				"lightning fast",
				"cognitive load",
				"game-changing",
				"mission-critical",
				"out of the box",
				"seamlessly",
				"seamless",
				"the future of",
				"we're excited",
				"today, we're excited to",
				"as an ai",
				"let's dive into",
				"in today's fast-paced",
				"ever-evolving landscape",
			];
			const lower = addedText.toLowerCase();
			const hit = banned.find((phrase) => lower.includes(phrase));
			if (hit) {
				return deny(
					`Blocked: "${hit}" is a banned word/phrase for product/marketing copy. See .cursor/rules/writing.mdc for the replacement.`,
				);
			}
		}

		process.exit(0);
	} catch (err) {
		console.error(
			`[rule-guard] parse error, allowing (fail open): ${err.message}`,
		);
		process.exit(0);
	}
});

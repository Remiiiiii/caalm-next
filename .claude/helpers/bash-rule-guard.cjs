#!/usr/bin/env node
// Consolidated PreToolUse guard for Bash: mechanically-checkable rules that
// only make sense against a shell command (package installs, gh pr create),
// not a file edit. Same no-judgment, pattern-match-only approach as
// rule-guard.cjs — see that file's header for what's deliberately NOT covered.

const { execSync } = require("node:child_process");

let input = "";
process.stdin.on("data", (c) => {
	input += c;
});
process.stdin.on("end", () => {
	try {
		const payload = JSON.parse(input || "{}");
		if (payload.tool_name !== "Bash") {
			process.exit(0);
		}

		const command = (payload.tool_input || {}).command || "";

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

		// no-workflow-engine-sprawl.mdc: block installing a second
		// workflow/orchestration engine via pnpm/npm/yarn.
		if (/\b(pnpm|npm|yarn)\s+(add|install|i)\b/.test(command)) {
			const bannedPackages = [
				/@temporalio\/[\w-]+/i,
				/\btemporalio\b/i,
				/\btemporal-client\b/i,
				/\bcamunda[\w-]*\b/i,
				/\bzeebe[\w-]*\b/i,
				/\bcadence-client\b/i,
				/@io-orkes\/conductor-javascript/i,
				/\bkafkajs\b/i,
				/\bnode-rdkafka\b/i,
				/@confluentinc\/kafka-javascript/i,
			];
			for (const re of bannedPackages) {
				const match = command.match(re);
				if (match) {
					return deny(
						`Blocked: installing '${match[0]}' looks like a second workflow/orchestration engine (Temporal/Camunda/Cadence/Conductor/Kafka). CAALM keeps approval workflows in-app. See .cursor/rules/no-workflow-engine-sprawl.mdc — if this is a deliberate, explicit architecture decision, say so and I'll proceed.`,
					);
				}
			}
		}

		// nonprofit-roadmap-prs.mdc / platform-readiness-roadmap-prs.mdc:
		// batch PRs are the implementation ticket, never a placeholder.
		if (/\bgh\s+pr\s+create\b/.test(command)) {
			let branch = "";
			try {
				branch = execSync("git rev-parse --abbrev-ref HEAD", {
					cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
					encoding: "utf8",
				}).trim();
			} catch {
				branch = "";
			}

			const isNpoBatch = /^cursor\/nonprofit\//.test(branch);
			const isPrdBatch = /^cursor\/platform-readiness\//.test(branch);

			if (isNpoBatch || isPrdBatch) {
				const rule = isNpoBatch
					? ".cursor/rules/nonprofit-roadmap-prs.mdc"
					: ".cursor/rules/platform-readiness-roadmap-prs.mdc";

				if (/\bstub\b/i.test(command)) {
					return deny(
						`Blocked: 'stub' appears in this gh pr create command while on batch branch '${branch}'. Batch PRs are the implementation ticket, not a placeholder — never put "stub" in the title or body. See ${rule}.`,
					);
				}
				if (/merging does not mark tasks complete/i.test(command)) {
					return deny(
						`Blocked: this command includes legacy "merging does not mark tasks complete" text, which is wrong for batch PRs (merging with green CI does mark them complete). See ${rule}.`,
					);
				}
			}
		}

		process.exit(0);
	} catch (err) {
		console.error(
			`[bash-rule-guard] parse error, allowing (fail open): ${err.message}`,
		);
		process.exit(0);
	}
});

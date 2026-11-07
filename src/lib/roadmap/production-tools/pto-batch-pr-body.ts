/**
 * Markdown bodies for Production Tools batch PRs (Ask CAALM A–O tool gap list).
 * Mirrors the PRD body builder; one PR per batch (up to five task codes).
 */

import { findCatalogTask } from "../catalog-query";
import { parseSpecBullets } from "../nonprofit/npo-batch-pr-body";
import { PRODUCTION_TOOLS_ROADMAP_CATALOG } from "../production-tools-catalog";
import type { RoadmapCatalogSection } from "../types";
import type { PtoPrBatch } from "./pto-pr-batches";
import {
	ptoBatchBranchName,
	ptoBatchDisplayTitle,
	ptoBatchFileId,
	ptoCatalogDisplayTitleForPr,
} from "./pto-pr-batches";

const SPEC_KEYS = ["Who", "What", "Where", "Why", "When", "How"] as const;

/** Plain-English section goal for reviewers (not file paths). */
export const PTO_SECTION_PLAIN_INTRO: Record<number, string> = {
	0: "Stand up a fourth IT roadmap board so the Ask CAALM assistant tool build has its own timeline, separate from CLM, nonprofit, and platform readiness.",
	1: "Let the assistant invite, list, re-role, and deactivate users on the admin's behalf—always under the admin's own permission, with confirm and audit.",
	2: "Give the assistant the full contract lifecycle: read, ask, create, update, bulk update, extract, summarize, compare, redline, obligations, negotiate, e-sign, approve, renew, files, export.",
	3: "Let the assistant open, create, renew, approve, and extract licenses—not just search them.",
	4: "Let the assistant act on approvals (approve, reject, reassign, override) instead of only listing them.",
	5: "Let the assistant search the clause library, curate clauses and templates, and seed clauses from documents.",
	6: "Deepen audit work: read findings and CAPs, set stance, create and assign corrective actions, attach evidence, view the portfolio, export, and run readiness.",
	7: "Add nonprofit funding and proposals: search grants, track funding obligations, create proposals, and link awards to agreements.",
	8: "Add CRM-lite for nonprofits: constituents, relationships, gifts, donation pages, volunteers, and the suggested-ask helper.",
	9: "Fill calendar gaps: invite attendees, decide calendar approvals, share calendars, and run public events.",
	10: "Fill task gaps: edit and reassign tasks, focused lists, cross-links to licenses and findings, and cancel.",
	11: "Add safe ticket intake and workflow plus read-only IT runbook and health—never raw database, force-delete, or schema tools in chat.",
	12: "Let the assistant draft and send mail (Gmail, Outlook), report integration status, sync calendars, and draft from CRM deals—mail always confirms.",
	13: "Add morning briefing and news reads, a notification inbox, and the SMS test.",
	14: "Explain dashboard metrics in plain English, export tables, and schedule reports—honest about sample vs live data.",
	15: "Add the agent safety layer: preview before confirm, undo where safe, explain denials, list capabilities, and compose multi-step skills.",
};

function catalogTaskForCode(
	taskCode: string,
): RoadmapCatalogSection["tasks"][number] | undefined {
	for (const section of PRODUCTION_TOOLS_ROADMAP_CATALOG) {
		const task = findCatalogTask(section.tasks, taskCode);
		if (task) return task;
	}
	return undefined;
}

function taskRangeLabel(batch: PtoPrBatch): string {
	const last = batch.taskCodes[batch.taskCodes.length - 1];
	if (batch.taskCodes.length === 1 || !last) return batch.taskCodes[0] ?? "";
	return `${batch.taskCodes[0]}–${last}`;
}

function markerPath(batch: PtoPrBatch): string {
	return `src/lib/roadmap/pto-batches/${ptoBatchFileId(batch)}.ts`;
}

export function ptoBatchPullRequestTitle(forPrNumber: number): string {
	const label = ptoCatalogDisplayTitleForPr(forPrNumber);
	return label || `PTO batch PR #${forPrNumber}`;
}

export function buildPtoBatchPrBody(
	batch: PtoPrBatch,
	options: { forPrNumber?: number } = {},
): string {
	const forPrNumber = options.forPrNumber ?? batch.linkedPrNumber;
	if (forPrNumber == null) {
		throw new Error("Batch has no linked PR number");
	}

	const branch = ptoBatchBranchName(batch);
	const range = taskRangeLabel(batch);
	const marker = markerPath(batch);
	const intro =
		PTO_SECTION_PLAIN_INTRO[batch.sectionNumber] ??
		`Production Tools section ${batch.sectionNumber}: ${batch.sectionTitle}.`;

	const summaryLines = [
		`Implement **all tasks in this batch** on **this pull request** and branch \`${branch}\`.`,
		`Board: **Production Tools Roadmap** (\`?catalog=pto\`).`,
		`Section ${batch.sectionNumber} batch ${batch.batch}: **${range}** — ${batch.sectionTitle}. Batch marker: \`${marker}\`.`,
		`**Do not** open separate PRs per task code. Finish every task below on this branch.`,
		`Each tool: permission from the database (no role-name bypass), confirm before a mutating write, audit who/what/when/tenant on success.`,
		`2a rule: wrap the existing product API. If a backend does not exist yet, ship a permission-gated honest "not available yet" response and leave the task incomplete.`,
		`When each task meets its **Done when** bullets and CI is green, merging **PR #${forPrNumber}** marks **${range}** complete on the roadmap.`,
	];

	const agentSteps = [
		"1. Read the section story and each task below in plain English.",
		"2. Implement in order on **this branch** (one batch PR, up to five tasks).",
		"3. Register each tool in the Ask CAALM tool registry with requiredPermissions; it only appears when the user has the permission.",
		"4. Confirm before any mutating write; write an audit entry on success; never a fake success audit on a denied or failed attempt.",
		"5. Keep AI document extraction human-in-the-loop (no auto-save); keep sales/support copy honest.",
	];

	const taskSections: string[] = [];
	for (const code of batch.taskCodes) {
		const catalogTask = catalogTaskForCode(code);
		const title =
			catalogTask?.title ??
			batch.taskTitles[batch.taskCodes.indexOf(code)] ??
			code;
		const spec = parseSpecBullets(catalogTask?.description ?? "");
		taskSections.push(`### ${code} ${title}`, "");
		for (const key of SPEC_KEYS) {
			const value = spec[key];
			if (value) taskSections.push(`- **${key}:** ${value}`);
		}
		const done = catalogTask?.acceptanceCriteria ?? [];
		if (done.length) {
			taskSections.push("", "**Done when**");
			for (const line of done) {
				taskSections.push(`- ${line}`);
			}
		}
		taskSections.push("");
	}

	const testPlan = [
		"- [ ] Each task meets its **Done when** bullets",
		`- [ ] Roadmap tests at \`tests/roadmap/pto/{code}.test.ts\` (dots → dashes) pass or ship with the feature`,
		"- [ ] `pnpm run test:api-authz` passes when routes or permissions change",
		"- [ ] **Tests and Vercel deploy / Playwright E2E** green on this PR before merge",
	];

	return [
		"## Summary",
		...summaryLines,
		"",
		"## Why this section matters (plain English)",
		intro,
		"",
		"## Agent instructions",
		...agentSteps,
		"",
		"## Tasks (Who / What / Where / Why / When / How)",
		"",
		...taskSections,
		"## Test plan",
		...testPlan,
		"",
		"## CI and merge",
		"",
		"- Block merge on **main** until **Tests and Vercel deploy → Playwright E2E** passes on this PR.",
		"- Fix failures on **this batch branch/PR only**—do not open a separate fix PR for batch scope.",
		"",
		"## Security notes",
		"Org-scope every query; permission gates on every tool; no role-name bypasses; confirm + audit on mutations.",
	].join("\n");
}

/** Body for a batch before the GitHub PR number exists. */
export function buildPtoBatchPrBodyDraft(batch: PtoPrBatch): string {
	return buildPtoBatchPrBody(batch, { forPrNumber: batch.linkedPrNumber ?? 0 })
		.replace(/\*\*PR #0\*\*/g, "**this PR**")
		.replace(/PR #0/g, "this PR");
}

export function ptoBatchPullRequestTitleDraft(batch: PtoPrBatch): string {
	return ptoBatchDisplayTitle(batch);
}

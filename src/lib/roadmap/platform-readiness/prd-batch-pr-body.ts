/**
 * Markdown bodies for Platform Readiness batch PRs (implementation tickets).
 */

import { findCatalogTask } from "../catalog-query";
import { parseSpecBullets } from "../nonprofit/npo-batch-pr-body";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "../platform-readiness-catalog";
import type { RoadmapCatalogSection } from "../types";
import type { PrdPrBatch } from "./prd-pr-batches";
import {
	prdBatchBranchName,
	prdBatchFileId,
	prdCatalogDisplayTitleForPr,
} from "./prd-pr-batches";

const SPEC_KEYS = ["Who", "What", "Where", "Why", "When", "How"] as const;

/** Plain-English section goal for reviewers and sales (not file paths). */
export const PRD_SECTION_PLAIN_INTRO: Record<number, string> = {
	0: "Stand up a third IT roadmap board so security and honesty work has its own timeline, separate from the CLM product build and the nonprofit board.",
	1: "Each customer workspace must only see its own contracts, licenses, files, and invites—even when someone can “view all” inside their org. This batch fixes that in the product and proves it with two-org tests plus a short note for sales.",
	2: "Sensitive server routes (files, analytics, AI tools, old duplicate paths) must check permissions before returning data. This batch closes gaps and makes CI fail if the “unguarded routes” list grows again.",
	3: "Sign-in and two-factor flows must be trustworthy: users can only change their own 2FA, test backdoors stay out of production, and security actions show up in the audit log.",
	4: "Dashboards and compliance views must not pretend fake numbers are real. Production should use live audit data, charts should say when they are sample data, and mixed mock/live views need a clear banner.",
	5: "The IT portal must not show made-up CPU graphs or a wall of “coming soon” links that look finished. Show real signals, honest empty states, or a visible Preview label.",
	6: "Enterprise settings and sales conversations must match what is actually wired today—integrations, security questionnaires, demo scripts, and a clean handoff to CLM for SSO/API buildout later.",
};

function catalogTaskForCode(
	taskCode: string,
): RoadmapCatalogSection["tasks"][number] | undefined {
	for (const section of PLATFORM_READINESS_ROADMAP_CATALOG) {
		const task = findCatalogTask(section.tasks, taskCode);
		if (task) return task;
	}
	return undefined;
}

function taskRangeLabel(batch: PrdPrBatch): string {
	const last = batch.taskCodes[batch.taskCodes.length - 1];
	if (batch.taskCodes.length === 1 || !last) return batch.taskCodes[0] ?? "";
	return `${batch.taskCodes[0]}–${last}`;
}

function markerPath(batch: PrdPrBatch): string {
	return `src/lib/roadmap/prd-batches/${prdBatchFileId(batch)}.ts`;
}

export function prdBatchPullRequestTitle(forPrNumber: number): string {
	const label = prdCatalogDisplayTitleForPr(forPrNumber);
	return label ? `PRD ${label}` : `PRD batch PR #${forPrNumber}`;
}

export function buildPrdBatchPrBody(
	batch: PrdPrBatch,
	options: { forPrNumber?: number } = {},
): string {
	const forPrNumber = options.forPrNumber ?? batch.linkedPrNumber;
	if (forPrNumber == null) {
		throw new Error("Batch has no linked PR number");
	}

	const branch = prdBatchBranchName(batch);
	const range = taskRangeLabel(batch);
	const marker = markerPath(batch);
	const intro =
		PRD_SECTION_PLAIN_INTRO[batch.sectionNumber] ??
		`Platform Readiness section ${batch.sectionNumber}: ${batch.sectionTitle}.`;

	const summaryLines = [
		`Implement **all tasks in this batch** on **this pull request** and branch \`${branch}\`.`,
		`Board: **Platform Readiness Roadmap** (\`?catalog=prd\`). CLM §1–2 are pointers only (Option A)—do that work here, not on the CLM board.`,
		`Section ${batch.sectionNumber} batch ${batch.batch}: **${range}** — ${batch.sectionTitle}. Batch marker: \`${marker}\`.`,
		`**Do not** open separate PRs per task code. Finish every task below on this branch.`,
		`When each task meets its **Done when** bullets and CI is green, merging **PR #${forPrNumber}** marks **${range}** complete on the roadmap.`,
	];

	const agentSteps = [
		"1. Read the section story and each task below in plain English.",
		"2. Implement in order on **this branch** (one batch PR, up to five tasks).",
		"3. Use permission checks and org-scoped queries—no role-name bypasses.",
		"4. Sync demo database schema if production schema changes (`node scripts/sync-demo-database-schema.mjs --apply`).",
		"5. Keep sales/support copy honest—no claims beyond what tests prove.",
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
		`- [ ] Roadmap tests at \`tests/roadmap/prd/{code}.test.ts\` (dots → dashes) pass or ship with the feature`,
		"- [ ] Demo schema synced when prod schema changes",
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
		"- **Deploy to Vercel (production)** runs on push to **main** after merge.",
		"- Fix failures on **this batch branch/PR only**—do not open a separate fix PR for batch scope.",
		"",
		"## Security notes",
		"Org-scope every query; permission gates on all routes; no role-name bypasses.",
	].join("\n");
}

/** Body for a batch before the GitHub PR number exists (placeholder #0 in title lines). */
export function buildPrdBatchPrBodyDraft(batch: PrdPrBatch): string {
	return buildPrdBatchPrBody(batch, { forPrNumber: batch.linkedPrNumber ?? 0 })
		.replace(/\*\*PR #0\*\*/g, "**this PR**")
		.replace(/PR #0/g, "this PR");
}

export function prdBatchPullRequestTitleDraft(batch: PrdPrBatch): string {
	const last = batch.taskCodes[batch.taskCodes.length - 1];
	const range =
		batch.taskCodes.length === 1 || !last
			? batch.taskCodes[0]
			: `${batch.taskCodes[0]}–${last}`;
	return `PRD S${batch.sectionNumber} B${batch.batch} ${batch.sectionTitle} (${range})`;
}

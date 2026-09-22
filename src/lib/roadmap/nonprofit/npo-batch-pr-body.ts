/**
 * Markdown bodies for Nonprofit Roadmap batch PRs (implementation tickets).
 */

import { findCatalogTask } from "../catalog-query";
import { NONPROFIT_ROADMAP_CATALOG } from "../nonprofit-catalog";
import type { RoadmapCatalogSection } from "../types";
import type { NpoPrBatch } from "./npo-pr-batches";
import {
	npoBatchBranchName,
	npoBatchFileId,
	npoCatalogDisplayTitleForPr,
} from "./npo-pr-batches";

const SPEC_KEYS = ["Who", "What", "Where", "Why", "When", "How"] as const;
type SpecKey = (typeof SPEC_KEYS)[number];

export function parseSpecBullets(
	description: string,
): Partial<Record<SpecKey, string>> {
	const whoIdx = description.indexOf("Who:");
	const slice = whoIdx >= 0 ? description.slice(whoIdx) : description;
	const out: Partial<Record<SpecKey, string>> = {};
	for (let i = 0; i < SPEC_KEYS.length; i++) {
		const key = SPEC_KEYS[i]!;
		const nextKey = SPEC_KEYS[i + 1];
		const start = slice.indexOf(`${key}:`);
		if (start < 0) continue;
		const contentStart = start + key.length + 1;
		const end = nextKey
			? slice.indexOf(`${nextKey}:`, contentStart)
			: slice.length;
		const raw = slice.slice(contentStart, end >= 0 ? end : undefined).trim();
		out[key] = raw.replace(/\.\s*$/, "");
	}
	return out;
}

function catalogTaskForCode(
	taskCode: string,
): RoadmapCatalogSection["tasks"][number] | undefined {
	for (const section of NONPROFIT_ROADMAP_CATALOG) {
		const task = findCatalogTask(section.tasks, taskCode);
		if (task) return task;
	}
	return undefined;
}

function taskRangeLabel(batch: NpoPrBatch): string {
	const last = batch.taskCodes[batch.taskCodes.length - 1];
	if (batch.taskCodes.length === 1 || !last) return batch.taskCodes[0] ?? "";
	return `${batch.taskCodes[0]}–${last}`;
}

function markerPath(batch: NpoPrBatch): string {
	return `src/lib/roadmap/npo-batches/${npoBatchFileId(batch)}.ts`;
}

/** GitHub PR title — never use the word "stub". */
export function npoBatchPullRequestTitle(prNumber: number): string {
	const label = npoCatalogDisplayTitleForPr(prNumber);
	return label ? `NPO ${label}` : `NPO batch PR #${prNumber}`;
}

export type BuildNpoBatchPrBodyOptions = {
	/** Defaults to batch.linkedPrNumber */
	forPrNumber?: number;
};

/**
 * Build the full PR description for a nonprofit batch ticket.
 * Section 1 batch 1: PR #109 is placeholder-only; #131 is the implementation PR.
 */
export function buildNpoBatchPrBody(
	batch: NpoPrBatch,
	options: BuildNpoBatchPrBodyOptions = {},
): string {
	const forPrNumber = options.forPrNumber ?? batch.linkedPrNumber;
	if (forPrNumber == null) {
		throw new Error("Batch has no linked PR number");
	}

	const branch = npoBatchBranchName(batch);
	const range = taskRangeLabel(batch);
	const marker = markerPath(batch);
	const isS1B1Placeholder =
		batch.productPrNumber != null && forPrNumber === batch.linkedPrNumber;
	const implementationPr = batch.productPrNumber;
	const completesOnMerge = !isS1B1Placeholder;

	const summaryLines: string[] = [];
	if (isS1B1Placeholder && implementationPr != null) {
		summaryLines.push(
			`PR **#${forPrNumber}** is a **board placeholder only** (merge completes zero tasks).`,
			`Implement tasks **${range}** on **PR #${implementationPr}** — same batch scope, not separate PRs per task code.`,
			`Branch prefix \`cursor/nonprofit/\` keeps work on the Nonprofit Roadmap, not the agent PR log.`,
			`Batch marker: \`${marker}\`.`,
		);
	} else {
		summaryLines.push(
			`Implement **all tasks in this batch** on **this pull request** and branch \`${branch}\`.`,
			`Prefix \`cursor/nonprofit/\` keeps work on the Nonprofit Roadmap, not the agent PR log.`,
			`Section ${batch.sectionNumber} batch ${batch.batch}: **${range}** (${batch.sectionTitle}). Batch marker: \`${marker}\`.`,
			`**Do not** open separate PRs per task code. Finish every task below on this branch.`,
		);
		if (completesOnMerge) {
			summaryLines.push(
				`When each task meets its **Done when** bullets and CI is green, merging **PR #${forPrNumber}** marks **${range}** complete on the roadmap.`,
			);
		}
	}

	const agentSteps = isS1B1Placeholder
		? [
				`1. Switch to PR **#${implementationPr}** (or its branch) for all product code.`,
				"2. Use the task specs below as the scope — do not invent alternate requirements.",
				"3. Implement in dependency order within that PR.",
			]
		: [
				"1. Read each task section below.",
				"2. Implement in dependency order on **this branch**.",
				"3. Optionally note completion per task in the PR description as you go.",
				"4. Use `requirePermission`, org-scoped queries, and MCP for schema — no Super Admin bypasses.",
				"5. Do **not** merge while **Tests and Vercel deploy / Playwright E2E** is red on this PR. If deploy fails after merge, fix on **this same branch/PR** — no separate deploy-fix PR.",
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
		"- [ ] Roadmap tests at `tests/roadmap/npo/{code}.test.ts` (dots → dashes) pass or ship with the feature",
	];
	if (!isS1B1Placeholder) {
		testPlan.push(
			"- [ ] Demo schema synced when prod schema changes (`node scripts/sync-demo-database-schema.mjs --apply`)",
			"- [ ] **Tests and Vercel deploy / Playwright E2E** green on this PR before merge",
		);
	}

	const ciMergeSection = isS1B1Placeholder
		? []
		: [
				"## CI and merge",
				"",
				"- Block merge on **main** until **Tests and Vercel deploy → Playwright E2E** passes on this PR.",
				"- **Deploy to Vercel (production)** runs on push to **main** after merge; roadmap completion also needs that job (and Playwright on push) green on the merge commit.",
				"- Deploy or E2E failure: fix on **this batch branch/PR only** — do not open a separate fix PR for batch scope.",
				"",
			];

	return [
		"## Summary",
		...summaryLines.map((line) => (line.startsWith("**") ? line : line)),
		"",
		"## Agent instructions",
		...agentSteps,
		"",
		"## Tasks",
		"",
		...taskSections,
		"## Test plan",
		...testPlan,
		"",
		...ciMergeSection,
		"## Security notes",
		isS1B1Placeholder
			? "Product work on the implementation PR must use permission gates and org-scoped data access."
			: "Org-scope every query; permission gates on all routes; no role-name bypasses.",
	].join("\n");
}

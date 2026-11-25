/**
 * Markdown PR bodies for the Todo Roadmap. One task per section (these 20
 * backlog items are unrelated), so this builds directly from a catalog
 * section's single task rather than a batch table like the other catalogs.
 */

import { parseSpecBullets } from "../nonprofit/npo-batch-pr-body";
import type { RoadmapCatalogSection } from "../types";

const SPEC_KEYS = ["Who", "What", "Where", "Why", "When", "How"] as const;

/**
 * Path (relative to repo root) of the structured-data sidecar committed
 * alongside the ticket marker on a section's branch — read back by
 * sync-from-github.ts so GitHub stays the source of truth for the section's
 * title/description/acceptance criteria, not just its PR link.
 */
export function todoSectionSidecarPath(sectionNumber: number): string {
	return `src/lib/roadmap/todo-batches/s${String(sectionNumber).padStart(2, "0")}.json`;
}

export function todoBranchName(section: RoadmapCatalogSection): string {
	const task = section.tasks[0];
	const slug = section.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 40);
	return `cursor/todo/${section.sectionNumber}-${task?.taskCode ?? section.sectionNumber}-${slug}`;
}

export function todoPullRequestTitle(section: RoadmapCatalogSection): string {
	const task = section.tasks[0];
	return `TODO ${task?.taskCode ?? section.sectionNumber} ${section.title}`;
}

export function buildTodoSectionPrBody(section: RoadmapCatalogSection): string {
	const task = section.tasks[0];
	if (!task) {
		throw new Error(`Todo section ${section.sectionNumber} has no task`);
	}
	const branch = todoBranchName(section);
	const spec = parseSpecBullets(task.description);

	const specLines: string[] = [];
	for (const key of SPEC_KEYS) {
		const value = spec[key];
		if (value) specLines.push(`- **${key}:** ${value}`);
	}

	const doneLines = task.acceptanceCriteria.map((line) => `- [ ] ${line}`);

	return [
		"## Summary",
		`Implement **${task.title}** on branch \`${branch}\`.`,
		`Board: **Todo Roadmap** (\`?catalog=todo\`), section ${section.sectionNumber} (\`${task.taskCode}\`).`,
		`Source: ${section.sourceRef}.`,
		"",
		"## Who / What / Where / Why / When / How",
		"",
		...specLines,
		"",
		"## Done when",
		"",
		...doneLines,
		"",
		"## Test plan",
		`- [ ] Roadmap test at \`${task.testSuiteRef}\` passes or ships with the feature`,
		"- [ ] `pnpm run test:api-authz` passes when routes or permissions change",
		"- [ ] Tests and Vercel deploy / Playwright E2E green on this PR before merge",
	].join("\n");
}

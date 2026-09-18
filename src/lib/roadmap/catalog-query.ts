/**
 * Catalog helpers that operate on any roadmap catalog array.
 * CLM wrappers in catalog.ts stay unchanged for existing tests.
 */

import type { RoadmapCatalogSection } from "./types";

/** Same stub set as catalog.ts — keep in sync (PR #63). */
const TRACKING_STUB_PRS = new Set([63]);

export function findCatalogTask(
	tasks: RoadmapCatalogSection["tasks"],
	taskCode: string,
): RoadmapCatalogSection["tasks"][number] | undefined {
	for (const task of tasks) {
		if (task.taskCode === taskCode) return task;
		if (task.children?.length) {
			const nested = findCatalogTask(task.children, taskCode);
			if (nested) return nested;
		}
	}
	return undefined;
}

export function linkedPrNumbersInCatalog(
	catalog: RoadmapCatalogSection[],
	sectionNumber: number,
): number[] {
	return (
		catalog.find((s) => s.sectionNumber === sectionNumber)?.linkedPrNumbers ??
		[]
	);
}

export function sectionCompletesOnMergedCatalogPrIn(
	catalog: RoadmapCatalogSection[],
	sectionNumber: number,
): boolean {
	const section = catalog.find((s) => s.sectionNumber === sectionNumber);
	return section?.completesOnMerge !== false;
}

export function catalogTasksHaveLinkedPr(
	tasks: RoadmapCatalogSection["tasks"],
): boolean {
	for (const task of tasks) {
		if (task.linkedPrNumber != null) return true;
		if (task.children?.length && catalogTasksHaveLinkedPr(task.children)) {
			return true;
		}
	}
	return false;
}

export function sectionUsesPerTaskPrCompletionIn(
	catalog: RoadmapCatalogSection[],
	sectionNumber: number,
): boolean {
	const section = catalog.find((s) => s.sectionNumber === sectionNumber);
	if (!section) return false;
	return catalogTasksHaveLinkedPr(section.tasks);
}

export function catalogTaskLinkedPrNumberIn(
	catalog: RoadmapCatalogSection[],
	taskCode: string,
): number | undefined {
	for (const section of catalog) {
		const found = findCatalogTask(section.tasks, taskCode);
		if (found?.linkedPrNumber != null) return found.linkedPrNumber;
	}
	return undefined;
}

export function catalogDisplayTitleForPrIn(
	catalog: RoadmapCatalogSection[],
	prNumber: number,
): string {
	const titles: string[] = [];
	for (const section of catalog) {
		const walk = (tasks: RoadmapCatalogSection["tasks"]) => {
			for (const task of tasks) {
				if (task.linkedPrNumber === prNumber) {
					titles.push(`${task.taskCode} ${task.title}`);
				}
				if (task.children?.length) walk(task.children);
			}
		};
		walk(section.tasks);
	}
	return titles.join(" · ");
}

export function unlinkedCatalogTaskCodesIn(
	catalog: RoadmapCatalogSection[],
	sectionNumber: number,
): string[] {
	const section = catalog.find((s) => s.sectionNumber === sectionNumber);
	if (!section) return [];
	const codes: string[] = [];
	const walk = (tasks: RoadmapCatalogSection["tasks"]) => {
		for (const task of tasks) {
			if (task.linkedPrNumber == null) codes.push(task.taskCode);
			if (task.children?.length) walk(task.children);
		}
	};
	walk(section.tasks);
	return codes;
}

export function displayedPrNumberForTaskIn(
	catalog: RoadmapCatalogSection[],
	taskCode: string,
	livePrNumber: number | null | undefined,
): number | null {
	const fromCatalog = catalogTaskLinkedPrNumberIn(catalog, taskCode);
	if (fromCatalog != null) return fromCatalog;
	if (livePrNumber != null && TRACKING_STUB_PRS.has(livePrNumber)) {
		return null;
	}
	if (livePrNumber != null) return livePrNumber;
	const sectionNumber = Number(taskCode.split(".")[0]);
	if (Number.isNaN(sectionNumber)) return null;
	const sectionPrs = linkedPrNumbersInCatalog(catalog, sectionNumber);
	if (sectionPrs.length === 1 && !TRACKING_STUB_PRS.has(sectionPrs[0])) {
		return sectionPrs[0];
	}
	return null;
}

export function sectionNumberForPrIn(
	catalog: RoadmapCatalogSection[],
	prNumber: number,
): number | undefined {
	for (const section of catalog) {
		if ((section.linkedPrNumbers ?? []).includes(prNumber)) {
			return section.sectionNumber;
		}
	}
	return undefined;
}

export function duplicatePrNumbersInCatalog(
	catalog: RoadmapCatalogSection[],
): number[] {
	const seen = new Map<number, number>();
	const duplicates = new Set<number>();
	for (const section of catalog) {
		for (const pr of section.linkedPrNumbers ?? []) {
			if (seen.has(pr)) duplicates.add(pr);
			else seen.set(pr, section.sectionNumber);
		}
	}
	return [...duplicates].sort((a, b) => a - b);
}

export function flattenCatalogTasks(catalog: RoadmapCatalogSection[]): Array<{
	sectionNumber: number;
	taskCode: string;
	title: string;
	testSuiteRef: string;
}> {
	const rows: Array<{
		sectionNumber: number;
		taskCode: string;
		title: string;
		testSuiteRef: string;
	}> = [];
	for (const section of catalog) {
		const walk = (tasks: RoadmapCatalogSection["tasks"]) => {
			for (const task of tasks) {
				rows.push({
					sectionNumber: section.sectionNumber,
					taskCode: task.taskCode,
					title: task.title,
					testSuiteRef: task.testSuiteRef,
				});
				if (task.children?.length) walk(task.children);
			}
		};
		walk(section.tasks);
	}
	return rows;
}

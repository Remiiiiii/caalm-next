/**
 * Locking engine — pure functions over in-memory snapshots.
 * Server is the source of truth; UI must not invent unlock rules.
 */

import type {
	RoadmapEntityStatus,
	RoadmapSection,
	RoadmapTask,
} from "./types";

export type LockSnapshot = {
	sections: RoadmapSection[];
	tasks: RoadmapTask[];
	/** Per-section merge blocker shown on locked tasks */
	mergeBlockReasons?: Record<string, string>;
};

export type StatusTransition = {
	entityType: "section" | "task";
	entityId: string;
	fromStatus: string;
	toStatus: string;
};

function sortSections(sections: RoadmapSection[]): RoadmapSection[] {
	return [...sections].sort(
		(a, b) => a.sectionNumber - b.sectionNumber || a.orderIndex - b.orderIndex,
	);
}

function topLevelTasks(tasks: RoadmapTask[], sectionId: string): RoadmapTask[] {
	return tasks
		.filter((t) => t.sectionId === sectionId && !t.parentTaskId)
		.sort((a, b) => a.orderIndex - b.orderIndex);
}

function childrenOf(tasks: RoadmapTask[], parentId: string): RoadmapTask[] {
	return tasks
		.filter((t) => t.parentTaskId === parentId)
		.sort((a, b) => a.orderIndex - b.orderIndex);
}

function allPriorSectionsComplete(
	sections: RoadmapSection[],
	section: RoadmapSection,
): boolean {
	return sections
		.filter((s) => s.sectionNumber < section.sectionNumber)
		.every((s) => s.status === "complete");
}

function deriveSectionStatus(
	section: RoadmapSection,
	sectionTasks: RoadmapTask[],
	priorComplete: boolean,
): RoadmapEntityStatus {
	if (sectionTasks.length === 0) {
		return priorComplete ? "available" : "locked";
	}
	if (sectionTasks.every((t) => t.status === "complete")) {
		return "complete";
	}
	if (!priorComplete) {
		return "locked";
	}
	if (sectionTasks.some((t) => t.status !== "locked")) {
		return "in_progress";
	}
	return "available";
}

/**
 * Walk sections/tasks in order and unlock the next available work.
 * Returns a new snapshot plus the list of status transitions applied.
 */
export function computeUnlocked(snapshot: LockSnapshot): {
	snapshot: LockSnapshot;
	transitions: StatusTransition[];
} {
	const sections = sortSections(snapshot.sections).map((s) => ({ ...s }));
	const tasks = snapshot.tasks.map((t) => ({ ...t }));
	const transitions: StatusTransition[] = [];

	const relockAvailable = (task: RoadmapTask) => {
		if (task.status !== "available") return;
		transitions.push({
			entityType: "task",
			entityId: task.$id,
			fromStatus: task.status,
			toStatus: "locked",
		});
		task.status = "locked";
		task.$updatedAt = new Date().toISOString();
	};

	const bumpSection = (section: RoadmapSection, to: RoadmapEntityStatus) => {
		if (section.status === to) return;
		transitions.push({
			entityType: "section",
			entityId: section.$id,
			fromStatus: section.status,
			toStatus: to,
		});
		section.status = to;
		section.$updatedAt = new Date().toISOString();
	};

	let openedIncompleteSection = false;

	for (const section of sections) {
		const sectionTasks = tasks.filter((t) => t.sectionId === section.$id);
		const priorComplete = allPriorSectionsComplete(sections, section);

		// Derive section completeness from tasks first
		const derived = deriveSectionStatus(section, sectionTasks, priorComplete);
		if (section.status !== derived) {
			bumpSection(section, derived);
		}

		if (section.status === "complete") {
			continue;
		}

		if (!priorComplete) {
			for (const task of sectionTasks) {
				relockAvailable(task);
			}
			if (section.status !== "locked") {
				bumpSection(section, "locked");
			}
			openedIncompleteSection = true;
			continue;
		}

		if (section.status === "locked") {
			bumpSection(section, "available");
		}

		// Tasks stay locked until the section's catalog PRs all merge.
		for (const task of sectionTasks) {
			relockAvailable(task);
		}

		openedIncompleteSection = true;
	}

	// Later unfinished sections stay locked. Sections whose tasks are already
	// all complete stay complete even if an earlier section is still open.
	if (openedIncompleteSection) {
		const firstOpen = sections.find((s) => s.status !== "complete");
		if (firstOpen) {
			for (const later of sections) {
				if (later.sectionNumber <= firstOpen.sectionNumber) continue;
				const laterTasks = tasks.filter((t) => t.sectionId === later.$id);
				const allDone =
					laterTasks.length > 0 &&
					laterTasks.every((t) => t.status === "complete");
				if (allDone) {
					if (later.status !== "complete") {
						bumpSection(later, "complete");
					}
					continue;
				}
				if (later.status !== "locked") {
					bumpSection(later, "locked");
				}
				for (const task of tasks.filter((t) => t.sectionId === later.$id)) {
					if (
						task.status === "available" ||
						task.status === "in_progress" ||
						task.status === "in_review"
					) {
						// Force-lock only pure available; leave in-flight alone if somehow present
						if (task.status === "available") {
							transitions.push({
								entityType: "task",
								entityId: task.$id,
								fromStatus: task.status,
								toStatus: "locked",
							});
							task.status = "locked";
							task.$updatedAt = new Date().toISOString();
						}
					}
				}
			}
		}
	}

	return { snapshot: { sections, tasks }, transitions };
}

export function lockReasonForTask(
	task: RoadmapTask,
	snapshot: LockSnapshot,
): string | undefined {
	if (task.status !== "locked") return undefined;

	const section = snapshot.sections.find((s) => s.$id === task.sectionId);
	if (!section) return "Unknown section";

	const sections = sortSections(snapshot.sections);
	if (!allPriorSectionsComplete(sections, section)) {
		const prior = sections
			.filter((s) => s.sectionNumber < section.sectionNumber)
			.find((s) => s.status !== "complete");
		return prior
			? `Finish section ${prior.sectionNumber} (${prior.title}) first`
			: "Finish prior sections first";
	}

	return (
		snapshot.mergeBlockReasons?.[section.$id] ??
		(task.prNumber != null
			? `Waiting for PR #${task.prNumber} to merge with green tests`
			: "Waiting for this section's pull requests to merge")
	);
}

export function computeProgressPercent(tasks: RoadmapTask[]): number {
	if (tasks.length === 0) return 0;
	const complete = tasks.filter((t) => t.status === "complete").length;
	return Math.round((complete / tasks.length) * 100);
}

export function countByStatus(tasks: RoadmapTask[]) {
	const counts = {
		total: tasks.length,
		complete: 0,
		locked: 0,
		available: 0,
		in_progress: 0,
		in_review: 0,
		blocked: 0,
	};
	for (const t of tasks) {
		if (t.status in counts) {
			counts[t.status as keyof typeof counts]++;
		}
	}
	return counts;
}

export function buildTaskTree(
	tasks: RoadmapTask[],
	sectionId: string,
	snapshot: LockSnapshot,
): import("./types").RoadmapTaskTreeNode[] {
	const tops = topLevelTasks(tasks, sectionId);
	const walk = (task: RoadmapTask): import("./types").RoadmapTaskTreeNode => ({
		...task,
		lockReason: lockReasonForTask(task, snapshot),
		children: childrenOf(tasks, task.$id).map(walk),
	});
	return tops.map(walk);
}

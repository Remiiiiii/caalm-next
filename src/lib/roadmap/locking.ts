/**
 * Locking engine — pure functions over in-memory snapshots.
 * Server is the source of truth; UI must not invent unlock rules.
 */

import type {
	RoadmapEntityStatus,
	RoadmapSection,
	RoadmapTask,
	RoadmapTaskStatus,
} from "./types";

export type LockSnapshot = {
	sections: RoadmapSection[];
	tasks: RoadmapTask[];
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

function isComplete(status: RoadmapTaskStatus): boolean {
	return status === "complete";
}

function priorSiblingsComplete(
	siblings: RoadmapTask[],
	task: RoadmapTask,
): boolean {
	return siblings
		.filter((s) => s.orderIndex < task.orderIndex)
		.every((s) => isComplete(s.status));
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

	const bumpTask = (task: RoadmapTask, to: RoadmapTaskStatus) => {
		if (task.status === to) return;
		// Never unlock past complete / in_review / in_progress / blocked via this engine
		if (
			task.status === "complete" ||
			task.status === "in_progress" ||
			task.status === "in_review" ||
			task.status === "blocked"
		) {
			return;
		}
		if (task.status === "locked" && to === "available") {
			transitions.push({
				entityType: "task",
				entityId: task.$id,
				fromStatus: task.status,
				toStatus: to,
			});
			task.status = to;
			task.$updatedAt = new Date().toISOString();
		}
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
			// Keep everything in this and later sections locked (except already advanced tasks)
			for (const task of sectionTasks) {
				if (task.status === "available") {
					// Should not stay available if prior section incomplete
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
			if (section.status !== "locked") {
				bumpSection(section, "locked");
			}
			openedIncompleteSection = true;
			break;
		}

		if (section.status === "locked") {
			bumpSection(section, "available");
		}

		const tops = topLevelTasks(tasks, section.$id);
		for (const task of tops) {
			if (
				task.status === "locked" &&
				priorSiblingsComplete(tops, task)
			) {
				bumpTask(task, "available");
			}

			const kids = childrenOf(tasks, task.$id);
			for (const child of kids) {
				if (
					child.status === "locked" &&
					task.status === "complete" &&
					priorSiblingsComplete(kids, child)
				) {
					bumpTask(child, "available");
				}
			}
		}

		openedIncompleteSection = true;
		break; // only the first incomplete section is opened
	}

	// Ensure later sections stay locked when we already opened one incomplete section
	if (openedIncompleteSection) {
		const firstOpen = sections.find((s) => s.status !== "complete");
		if (firstOpen) {
			for (const later of sections) {
				if (later.sectionNumber <= firstOpen.sectionNumber) continue;
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

	if (task.parentTaskId) {
		const parent = snapshot.tasks.find((t) => t.$id === task.parentTaskId);
		if (!parent || parent.status !== "complete") {
			return parent
				? `Finish parent task ${parent.taskCode} first`
				: "Finish the parent task first";
		}
		const kids = childrenOf(snapshot.tasks, task.parentTaskId);
		const incompletePrior = kids.find(
			(s) => s.orderIndex < task.orderIndex && s.status !== "complete",
		);
		if (incompletePrior) {
			return `Finish sibling task ${incompletePrior.taskCode} first`;
		}
	} else {
		const tops = topLevelTasks(snapshot.tasks, task.sectionId);
		const incompletePrior = tops.find(
			(s) => s.orderIndex < task.orderIndex && s.status !== "complete",
		);
		if (incompletePrior) {
			return `Finish task ${incompletePrior.taskCode} first`;
		}
	}

	return "Waiting for prerequisites";
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

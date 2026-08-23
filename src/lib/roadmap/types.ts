/**
 * CLM Completion Roadmap — domain types (Section 0).
 * Status can only become `complete` via the verified merge webhook path.
 */

export type RoadmapEntityStatus =
	| "locked"
	| "available"
	| "in_progress"
	| "complete";

export type RoadmapTaskStatus =
	| "locked"
	| "available"
	| "in_progress"
	| "in_review"
	| "complete"
	| "blocked";

export type RoadmapTestTrigger = "pr_update" | "pre_merge_recheck";

export type RoadmapTestResult = "pending" | "passed" | "failed" | "error";

export type RoadmapLogEntityType = "section" | "task";

export type RoadmapSection = {
	$id: string;
	sectionNumber: number;
	title: string;
	sourceRef: string;
	status: RoadmapEntityStatus;
	orderIndex: number;
	$createdAt: string;
	$updatedAt: string;
};

export type RoadmapTask = {
	$id: string;
	sectionId: string;
	parentTaskId: string | null;
	taskCode: string;
	title: string;
	description: string;
	acceptanceCriteria: string[];
	orderIndex: number;
	status: RoadmapTaskStatus;
	branchName: string | null;
	prUrl: string | null;
	prNumber: number | null;
	testSuiteRef: string;
	latestTestRunId: string | null;
	completedAt: string | null;
	completedCommitSha: string | null;
	$createdAt: string;
	$updatedAt: string;
};

export type RoadmapTestRun = {
	$id: string;
	taskId: string;
	prNumber: number;
	commitSha: string;
	triggeredBy: RoadmapTestTrigger;
	result: RoadmapTestResult;
	logsUrl: string;
	summary: string;
	startedAt: string;
	finishedAt: string | null;
};

export type RoadmapStatusLog = {
	$id: string;
	entityType: RoadmapLogEntityType;
	entityId: string;
	fromStatus: string;
	toStatus: string;
	actor: string;
	commitSha: string | null;
	testRunId: string | null;
	$createdAt: string;
};

export type RoadmapTaskTreeNode = RoadmapTask & {
	children: RoadmapTaskTreeNode[];
	lockReason?: string;
};

export type RoadmapSectionOverview = {
	id: string;
	sectionNumber: number;
	title: string;
	status: RoadmapEntityStatus;
	progressPercent: number;
	taskCounts: {
		total: number;
		complete: number;
		locked: number;
		available: number;
		in_progress: number;
		in_review: number;
		blocked: number;
	};
	/** Live GitHub PR title for the newest catalog PR */
	prTitle?: string | null;
	/** Catalog-linked GitHub PRs for this section. */
	prLinks?: Array<{
		number: number;
		title: string;
		state?: "open" | "closed" | "merged" | "unknown";
	}>;
	/** Why tasks in this section stay locked (missing merge or green tests). */
	mergeBlockReason?: string | null;
};

export type RoadmapOverview = {
	overallProgressPercent: number;
	sections: RoadmapSectionOverview[];
};

export type RoadmapCatalogSection = {
	sectionNumber: number;
	title: string;
	sourceRef: string;
	/** GitHub PR numbers matched to this section by topic (newest last) */
	linkedPrNumbers?: number[];
	tasks: RoadmapCatalogTask[];
};

export type RoadmapCatalogTask = {
	taskCode: string;
	title: string;
	description: string;
	acceptanceCriteria: string[];
	testSuiteRef: string;
	/** Child task codes (optional nesting) */
	children?: RoadmapCatalogTask[];
};

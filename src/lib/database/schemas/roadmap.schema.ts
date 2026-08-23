/**
 * Appwrite table attribute guide for CLM Roadmap collections.
 * Create tables with alphanumeric $id values (see appwriteConfig + .env.example).
 * Set ROADMAP_USE_APPWRITE=true after tables exist. Until then the engine uses memory seed.
 */

export const ROADMAP_SECTIONS_SCHEMA = {
	name: "roadmap_sections",
	attributes: [
		{ key: "sectionNumber", type: "integer", required: true },
		{ key: "title", type: "string", size: 256, required: true },
		{ key: "sourceRef", type: "string", size: 512, required: true },
		{
			key: "status",
			type: "string",
			size: 32,
			required: true,
			elements: ["locked", "available", "in_progress", "complete"],
		},
		{ key: "orderIndex", type: "integer", required: true },
	],
	indexes: [
		{
			key: "idx_section_order",
			type: "key",
			attributes: ["orderIndex"],
			orders: ["ASC"],
		},
		{
			key: "idx_section_number",
			type: "unique",
			attributes: ["sectionNumber"],
			orders: ["ASC"],
		},
	],
} as const;

export const ROADMAP_TASKS_SCHEMA = {
	name: "roadmap_tasks",
	attributes: [
		{ key: "sectionId", type: "string", size: 64, required: true },
		{ key: "parentTaskId", type: "string", size: 64, required: false },
		{ key: "taskCode", type: "string", size: 32, required: true },
		{ key: "title", type: "string", size: 256, required: true },
		{ key: "description", type: "string", size: 4000, required: true },
		{ key: "acceptanceCriteria", type: "string", array: true, size: 512 },
		{ key: "orderIndex", type: "integer", required: true },
		{
			key: "status",
			type: "string",
			size: 32,
			required: true,
			elements: [
				"locked",
				"available",
				"in_progress",
				"in_review",
				"complete",
				"blocked",
			],
		},
		{ key: "branchName", type: "string", size: 256, required: false },
		{ key: "prUrl", type: "string", size: 512, required: false },
		{ key: "prNumber", type: "integer", required: false },
		{ key: "testSuiteRef", type: "string", size: 256, required: true },
		{ key: "latestTestRunId", type: "string", size: 64, required: false },
		{ key: "completedAt", type: "datetime", required: false },
		{ key: "completedCommitSha", type: "string", size: 64, required: false },
	],
	indexes: [
		{
			key: "idx_task_section",
			type: "key",
			attributes: ["sectionId"],
			orders: ["ASC"],
		},
		{
			key: "idx_task_code",
			type: "unique",
			attributes: ["taskCode"],
			orders: ["ASC"],
		},
		{
			key: "idx_task_pr",
			type: "key",
			attributes: ["prNumber"],
			orders: ["ASC"],
		},
	],
} as const;

export const ROADMAP_TEST_RUNS_SCHEMA = {
	name: "roadmap_test_runs",
	attributes: [
		{ key: "taskId", type: "string", size: 64, required: true },
		{ key: "prNumber", type: "integer", required: true },
		{ key: "commitSha", type: "string", size: 64, required: true },
		{
			key: "triggeredBy",
			type: "string",
			size: 32,
			required: true,
			elements: ["pr_update", "pre_merge_recheck"],
		},
		{
			key: "result",
			type: "string",
			size: 16,
			required: true,
			elements: ["pending", "passed", "failed", "error"],
		},
		{ key: "logsUrl", type: "string", size: 512, required: true },
		{ key: "summary", type: "string", size: 1024, required: true },
		{ key: "startedAt", type: "datetime", required: true },
		{ key: "finishedAt", type: "datetime", required: false },
	],
	indexes: [
		{
			key: "idx_run_task",
			type: "key",
			attributes: ["taskId"],
			orders: ["ASC"],
		},
		{
			key: "idx_run_task_commit",
			type: "key",
			attributes: ["taskId", "commitSha"],
			orders: ["ASC", "ASC"],
		},
	],
} as const;

export const ROADMAP_STATUS_LOG_SCHEMA = {
	name: "roadmap_status_log",
	attributes: [
		{
			key: "entityType",
			type: "string",
			size: 16,
			required: true,
			elements: ["section", "task"],
		},
		{ key: "entityId", type: "string", size: 64, required: true },
		{ key: "fromStatus", type: "string", size: 32, required: true },
		{ key: "toStatus", type: "string", size: 32, required: true },
		{ key: "actor", type: "string", size: 128, required: true },
		{ key: "commitSha", type: "string", size: 64, required: false },
		{ key: "testRunId", type: "string", size: 64, required: false },
	],
	indexes: [
		{
			key: "idx_log_entity",
			type: "key",
			attributes: ["entityId"],
			orders: ["ASC"],
		},
		{
			key: "idx_log_entity_type",
			type: "key",
			attributes: ["entityType", "entityId"],
			orders: ["ASC", "ASC"],
		},
	],
} as const;

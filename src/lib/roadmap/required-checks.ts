/**
 * CLM roadmap completion requires these GitHub Actions checks on the merge
 * commit — not a local merge alone.
 *
 * UI labels look like:
 *   Tests and Vercel deploy / Playwright E2E (push)
 *   Tests and Vercel deploy / Deploy to Vercel (production)
 *
 * Deploy runs on push to main only (after Playwright). The "(pull_request)"
 * suffix users see on other jobs is the event; production deploy is push→main.
 */

export const ROADMAP_WORKFLOW_NAME = "Tests and Vercel deploy";

export const ROADMAP_REQUIRED_JOB_NAMES = {
	playwrightE2E: "Playwright E2E",
	deployProduction: "Deploy to Vercel (production)",
} as const;

export type WorkflowJobSummary = {
	name: string;
	conclusion: string | null;
};

export type WorkflowRunSummary = {
	name: string;
	event: string;
	conclusion: string | null;
	headSha: string;
	jobs: WorkflowJobSummary[];
};

export type RoadmapCompletionGate = {
	ok: boolean;
	reason?: string;
	playwrightPushPassed: boolean;
	deployProductionPassed: boolean;
};

function jobSucceeded(jobs: WorkflowJobSummary[], name: string): boolean {
	return jobs.some(
		(job) => job.name === name && job.conclusion === "success",
	);
}

/**
 * Playwright must succeed on a push event. Production deploy must succeed
 * (main pipeline after Playwright).
 */
export function evaluateRoadmapCompletionGate(
	runs: WorkflowRunSummary[],
): RoadmapCompletionGate {
	const pipelineRuns = runs.filter(
		(run) =>
			run.name === ROADMAP_WORKFLOW_NAME ||
			run.name.toLowerCase().includes("tests and vercel"),
	);

	const playwrightPushPassed = pipelineRuns.some(
		(run) =>
			run.event === "push" &&
			jobSucceeded(run.jobs, ROADMAP_REQUIRED_JOB_NAMES.playwrightE2E),
	);

	const deployProductionPassed = pipelineRuns.some((run) =>
		jobSucceeded(run.jobs, ROADMAP_REQUIRED_JOB_NAMES.deployProduction),
	);

	if (!playwrightPushPassed && !deployProductionPassed) {
		return {
			ok: false,
			reason:
				"Waiting for Tests and Vercel deploy / Playwright E2E (push) and Deploy to Vercel (production)",
			playwrightPushPassed,
			deployProductionPassed,
		};
	}
	if (!playwrightPushPassed) {
		return {
			ok: false,
			reason:
				"Waiting for Tests and Vercel deploy / Playwright E2E (push) to pass",
			playwrightPushPassed,
			deployProductionPassed,
		};
	}
	if (!deployProductionPassed) {
		return {
			ok: false,
			reason:
				"Waiting for Tests and Vercel deploy / Deploy to Vercel (production) to pass",
			playwrightPushPassed,
			deployProductionPassed,
		};
	}

	return {
		ok: true,
		playwrightPushPassed,
		deployProductionPassed,
	};
}

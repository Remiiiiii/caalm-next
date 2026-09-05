/**
 * Optional GitHub PR comment helper for cleared-to-merge messages.
 */

import { createGitHubAppJwt } from "@/lib/tickets/github-tickets.service";
import {
	stripHtmlFromPrBody,
	type GitHubPullRequestSummary,
} from "./github-pr-match";
import {
	evaluateRoadmapCompletionGate,
	type RoadmapCompletionGate,
} from "./required-checks";

function getRepo(): string {
	return (
		process.env.GITHUB_TICKETS_REPO || process.env.ROADMAP_GITHUB_REPO || ""
	);
}

const GITHUB_FETCH_MS = 8_000;
const TOKEN_CACHE_MS = 50 * 60 * 1000;

let installationTokenCache: { token: string; fetchedAt: number } | null = null;

async function getGitHubToken(): Promise<string | null> {
	const pat = process.env.GITHUB_TOKEN || process.env.ROADMAP_GITHUB_TOKEN;
	if (pat) return pat;

	if (
		installationTokenCache &&
		Date.now() - installationTokenCache.fetchedAt < TOKEN_CACHE_MS
	) {
		return installationTokenCache.token;
	}

	const appId = process.env.GITHUB_APP_ID;
	const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
	const installationId = process.env.GITHUB_INSTALLATION_ID;
	if (!appId || !privateKey || !installationId) return null;

	const jwt = createGitHubAppJwt(appId, privateKey);
	try {
		const res = await fetch(
			`https://api.github.com/app/installations/${installationId}/access_tokens`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${jwt}`,
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
					"User-Agent": "caalm-roadmap-engine",
				},
				signal: AbortSignal.timeout(GITHUB_FETCH_MS),
			},
		);
		if (!res.ok) return null;
		const body = (await res.json()) as { token: string };
		installationTokenCache = { token: body.token, fetchedAt: Date.now() };
		return body.token;
	} catch {
		return null;
	}
}

function githubHeaders(token: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"User-Agent": "caalm-roadmap-engine",
	};
}

let openPullRequestsCache: {
	fetchedAt: number;
	prs: GitHubPullRequestSummary[];
} | null = null;

const OPEN_PRS_CACHE_MS = 30_000;

export async function listOpenPullRequests(): Promise<
	GitHubPullRequestSummary[]
> {
	const repo = getRepo();
	const token = await getGitHubToken();
	if (!token || !repo.includes("/")) return [];

	const now = Date.now();
	if (
		openPullRequestsCache &&
		now - openPullRequestsCache.fetchedAt < OPEN_PRS_CACHE_MS
	) {
		return openPullRequestsCache.prs;
	}

	const [owner, name] = repo.split("/");
	let res: Response;
	try {
		res = await fetch(
			`https://api.github.com/repos/${owner}/${name}/pulls?state=open&per_page=100`,
			{
				headers: githubHeaders(token),
				signal: AbortSignal.timeout(GITHUB_FETCH_MS),
			},
		);
	} catch {
		return [];
	}
	if (!res.ok) return [];

	const json = (await res.json()) as Array<{
		number: number;
		title: string;
		html_url: string;
		state: string;
		draft?: boolean;
		created_at?: string;
		head?: { ref?: string };
	}>;

	const prs: GitHubPullRequestSummary[] = json.map((pr) => ({
		number: pr.number,
		title: pr.title,
		htmlUrl: pr.html_url,
		headRef: pr.head?.ref ?? "",
		state: "open",
		draft: Boolean(pr.draft),
		createdAt: pr.created_at,
	}));

	openPullRequestsCache = { fetchedAt: now, prs };
	return prs;
}

export async function postPullRequestComment(params: {
	prNumber: number;
	body: string;
}): Promise<{ posted: boolean; detail: string }> {
	const token = await getGitHubToken();
	const repo = getRepo();
	if (!token || !repo.includes("/")) {
		return {
			posted: false,
			detail: "GitHub token/repo not configured; comment skipped",
		};
	}

	const [owner, name] = repo.split("/");
	const res = await fetch(
		`https://api.github.com/repos/${owner}/${name}/issues/${params.prNumber}/comments`,
		{
			method: "POST",
			headers: {
				...githubHeaders(token),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ body: params.body }),
		},
	);

	if (!res.ok) {
		const text = await res.text();
		return {
			posted: false,
			detail: `GitHub comment failed: ${res.status} ${text.slice(0, 200)}`,
		};
	}
	return { posted: true, detail: "Comment posted" };
}

type PullRequestLiveStatus = {
	state: "open" | "closed" | "merged" | "unknown";
	htmlUrl?: string;
	title?: string;
	headRef?: string;
	number?: number;
	body?: string;
	mergedAt?: string | null;
	mergeCommitSha?: string;
};

const PR_STATUS_CACHE_MS = 60_000;
const prStatusCache = new Map<
	number,
	{ fetchedAt: number; value: PullRequestLiveStatus }
>();

export async function fetchPullRequestStatus(params: {
	prNumber: number;
}): Promise<PullRequestLiveStatus> {
	const cached = prStatusCache.get(params.prNumber);
	if (cached && Date.now() - cached.fetchedAt < PR_STATUS_CACHE_MS) {
		return cached.value;
	}

	const token = await getGitHubToken();
	const repo = getRepo();
	if (!token || !repo.includes("/")) {
		return { state: "unknown" };
	}
	const [owner, name] = repo.split("/");
	let res: Response;
	try {
		res = await fetch(
			`https://api.github.com/repos/${owner}/${name}/pulls/${params.prNumber}`,
			{
				headers: githubHeaders(token),
				signal: AbortSignal.timeout(GITHUB_FETCH_MS),
			},
		);
	} catch {
		return { state: "unknown" };
	}
	if (!res.ok) return { state: "unknown" };
	const json = (await res.json()) as {
		number: number;
		state: string;
		merged_at: string | null;
		merge_commit_sha: string | null;
		html_url: string;
		title: string;
		body?: string | null;
		head?: { ref?: string };
	};
	const headRef = json.head?.ref;
	const base = {
		number: json.number,
		htmlUrl: json.html_url,
		title: json.title,
		headRef,
		body: stripHtmlFromPrBody(json.body ?? ""),
		mergedAt: json.merged_at,
		mergeCommitSha: json.merge_commit_sha ?? undefined,
	};
	const value: PullRequestLiveStatus = json.merged_at
		? { state: "merged", ...base }
		: json.state === "closed"
			? { state: "closed", ...base }
			: { state: "open", ...base };
	prStatusCache.set(params.prNumber, { fetchedAt: Date.now(), value });
	return value;
}

type ActionsRunJson = {
	id: number;
	name: string;
	event: string;
	conclusion: string | null;
	head_sha: string;
};

type ActionsJobJson = {
	name: string;
	conclusion: string | null;
};

const COMPLETION_GATE_CACHE_MS = 30_000;
const completionGateCache = new Map<
	string,
	{ fetchedAt: number; value: RoadmapCompletionGate }
>();

/**
 * Fetch Actions runs + jobs for a commit and decide if CLM completion is allowed.
 * Fail closed when GitHub is unavailable — merge alone must not complete tasks.
 */
export async function fetchRoadmapCompletionGate(params: {
	commitSha: string;
}): Promise<RoadmapCompletionGate> {
	const sha = params.commitSha.trim();
	if (!sha) {
		return {
			ok: false,
			reason: "Missing commit SHA for required CI checks",
			playwrightPushPassed: false,
			deployProductionPassed: false,
		};
	}

	const cached = completionGateCache.get(sha);
	if (cached && Date.now() - cached.fetchedAt < COMPLETION_GATE_CACHE_MS) {
		return cached.value;
	}

	const token = await getGitHubToken();
	const repo = getRepo();
	if (!token || !repo.includes("/")) {
		const value: RoadmapCompletionGate = {
			ok: false,
			reason:
				"GitHub token/repo not configured — cannot verify Playwright E2E / production deploy",
			playwrightPushPassed: false,
			deployProductionPassed: false,
		};
		completionGateCache.set(sha, { fetchedAt: Date.now(), value });
		return value;
	}

	const [owner, name] = repo.split("/");
	let runsRes: Response;
	try {
		runsRes = await fetch(
			`https://api.github.com/repos/${owner}/${name}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=30`,
			{
				headers: githubHeaders(token),
				signal: AbortSignal.timeout(GITHUB_FETCH_MS),
			},
		);
	} catch {
		const value: RoadmapCompletionGate = {
			ok: false,
			reason: `Could not load Actions runs for ${sha.slice(0, 7)}`,
			playwrightPushPassed: false,
			deployProductionPassed: false,
		};
		completionGateCache.set(sha, { fetchedAt: Date.now(), value });
		return value;
	}

	if (!runsRes.ok) {
		const value: RoadmapCompletionGate = {
			ok: false,
			reason: `GitHub Actions runs unavailable (${runsRes.status}) for ${sha.slice(0, 7)}`,
			playwrightPushPassed: false,
			deployProductionPassed: false,
		};
		completionGateCache.set(sha, { fetchedAt: Date.now(), value });
		return value;
	}

	const runsJson = (await runsRes.json()) as { workflow_runs?: ActionsRunJson[] };
	const workflowRuns = runsJson.workflow_runs ?? [];

	const runsWithJobs = await Promise.all(
		workflowRuns.map(async (run) => {
			let jobs: ActionsJobJson[] = [];
			try {
				const jobsRes = await fetch(
					`https://api.github.com/repos/${owner}/${name}/actions/runs/${run.id}/jobs?per_page=50`,
					{
						headers: githubHeaders(token),
						signal: AbortSignal.timeout(GITHUB_FETCH_MS),
					},
				);
				if (jobsRes.ok) {
					const jobsJson = (await jobsRes.json()) as { jobs?: ActionsJobJson[] };
					jobs = jobsJson.jobs ?? [];
				}
			} catch {
				jobs = [];
			}
			return {
				name: run.name,
				event: run.event,
				conclusion: run.conclusion,
				headSha: run.head_sha,
				jobs: jobs.map((job) => ({
					name: job.name,
					conclusion: job.conclusion,
				})),
			};
		}),
	);

	const value = evaluateRoadmapCompletionGate(runsWithJobs);
	completionGateCache.set(sha, { fetchedAt: Date.now(), value });
	return value;
}

/** Test helper — clears completion-gate cache between vitest cases. */
export function clearRoadmapCompletionGateCacheForTests(): void {
	completionGateCache.clear();
}

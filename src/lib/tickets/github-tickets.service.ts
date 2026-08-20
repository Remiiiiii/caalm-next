import { createHmac, createSign, timingSafeEqual } from "node:crypto";
import type { GitHubIssueSnapshot } from "./ticket.types";
import { getTicketsRepo } from "./ticket.types";
import {
	getImpactLabel,
	getUrgencyLabel,
	type TicketImpactUrgency,
} from "./ticket-intake.constants";

type GitHubIssueResponse = {
	number: number;
	html_url: string;
	title: string;
	body: string | null;
	state: string;
	labels: Array<{ name: string }>;
	assignees: Array<{ login: string }>;
};

type GitHubCommentResponse = {
	id: number;
	user: { login: string };
	body: string;
	created_at: string;
};

function githubApiBase(): string {
	return "https://api.github.com";
}

function parseRepo(repo?: string): { owner: string; name: string } {
	const value = repo || getTicketsRepo();
	const [owner, name] = value.split("/");
	if (!owner || !name) {
		throw new Error(`Invalid GITHUB_TICKETS_REPO: ${value}`);
	}
	return { owner, name };
}

export function createGitHubAppJwt(
	appId: string,
	privateKey: string,
	nowSeconds = Math.floor(Date.now() / 1000),
): string {
	const header = Buffer.from(
		JSON.stringify({ alg: "RS256", typ: "JWT" }),
	).toString("base64url");
	const payload = Buffer.from(
		JSON.stringify({
			iat: nowSeconds - 60,
			exp: nowSeconds + 540,
			iss: appId,
		}),
	).toString("base64url");
	const data = `${header}.${payload}`;
	const signer = createSign("RSA-SHA256");
	signer.update(data);
	const signature = signer.sign(normalizePem(privateKey), "base64url");
	return `${data}.${signature}`;
}

function normalizePem(key: string): string {
	return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

export function verifyGitHubWebhookSignature(
	payload: string,
	signatureHeader: string | null,
	secret: string,
): boolean {
	if (!signatureHeader || !secret) return false;
	const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
	const a = Buffer.from(expected);
	const b = Buffer.from(signatureHeader);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

async function getInstallationToken(): Promise<string> {
	const token = process.env.GITHUB_TOKEN;
	if (token) return token;

	const appId = process.env.GITHUB_APP_ID;
	const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
	const installationId = process.env.GITHUB_INSTALLATION_ID;
	if (!appId || !privateKey || !installationId) {
		throw new Error("GitHub App credentials are not configured");
	}

	const jwt = createGitHubAppJwt(appId, privateKey);
	const res = await fetch(
		`${githubApiBase()}/app/installations/${installationId}/access_tokens`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${jwt}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);
	if (!res.ok) {
		throw new Error(`GitHub installation token failed: ${res.status}`);
	}
	const body = (await res.json()) as { token: string };
	return body.token;
}

async function githubFetch(
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const token = await getInstallationToken();
	return fetch(`${githubApiBase()}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"Content-Type": "application/json",
			...(init.headers || {}),
		},
	});
}

export function buildGitHubIssueBody(input: {
	name: string;
	userId: string;
	department: string;
	submittedAt: string;
	severity: string;
	category: string;
	affectedModule?: string | null;
	impact: string;
	urgency: string;
	description: string;
	ticketId: string;
	ticketNumber?: string | null;
}): string {
	const human = new Date(input.submittedAt).toUTCString();
	const impactLabel = getImpactLabel(input.impact as TicketImpactUrgency);
	const urgencyLabel = getUrgencyLabel(input.urgency as TicketImpactUrgency);
	const moduleLine = input.affectedModule
		? `**Affected service:** ${input.affectedModule}\n`
		: "";
	const numberLine = input.ticketNumber
		? `**Ticket number:** ${input.ticketNumber}\n`
		: "";

	return `### Submitted via CAALM Ticketing
**Submitted by:** ${input.name} (${input.userId})
**Department/Division:** ${input.department}
**Submitted at:** ${input.submittedAt} (${human})
${numberLine}**Category:** ${input.category}
${moduleLine}**Impact:** ${impactLabel}
**Urgency:** ${urgencyLabel}
**Severity:** ${input.severity}

---
${input.description}

---
_CAALM ticket number: ${input.ticketNumber || "n/a"} · id: ${input.ticketId}_
`;
}

export async function createGitHubIssue(input: {
	title: string;
	body: string;
	labels: string[];
	repo?: string;
}): Promise<{ number: number; htmlUrl: string; repo: string }> {
	const { owner, name } = parseRepo(input.repo);
	const res = await githubFetch(`/repos/${owner}/${name}/issues`, {
		method: "POST",
		body: JSON.stringify({
			title: input.title,
			body: input.body,
			labels: input.labels,
		}),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(
			`GitHub issue create failed for ${owner}/${name}: ${res.status} ${text}`,
		);
	}
	const issue = (await res.json()) as GitHubIssueResponse;
	return {
		number: issue.number,
		htmlUrl: issue.html_url,
		repo: `${owner}/${name}`,
	};
}

/** PRs that contain this commit. Used to map a Vercel GitHub status SHA to a ticket. */
export async function listPullsForCommit(
	sha: string,
	repo?: string,
): Promise<
	Array<{
		number: number;
		mergedAt: string | null;
		title: string;
		body: string;
	}>
> {
	const { owner, name } = parseRepo(repo);
	const res = await githubFetch(`/repos/${owner}/${name}/commits/${sha}/pulls`);
	if (!res.ok) {
		throw new Error(`GitHub commit pulls lookup failed: ${res.status}`);
	}
	const pulls = (await res.json()) as Array<{
		number: number;
		merged_at: string | null;
		title?: string;
		body?: string | null;
	}>;
	return pulls.map((pull) => ({
		number: pull.number,
		mergedAt: pull.merged_at,
		title: pull.title || "",
		body: pull.body || "",
	}));
}

export async function fetchGitHubIssue(
	issueNumber: number,
	repo?: string,
): Promise<GitHubIssueSnapshot> {
	const { owner, name } = parseRepo(repo);
	const issueRes = await githubFetch(
		`/repos/${owner}/${name}/issues/${issueNumber}`,
	);
	if (!issueRes.ok) {
		throw new Error(`GitHub issue fetch failed: ${issueRes.status}`);
	}
	const issue = (await issueRes.json()) as GitHubIssueResponse;

	const commentsRes = await githubFetch(
		`/repos/${owner}/${name}/issues/${issueNumber}/comments`,
	);
	const comments = commentsRes.ok
		? ((await commentsRes.json()) as GitHubCommentResponse[])
		: [];

	return {
		number: issue.number,
		title: issue.title,
		body: issue.body || "",
		htmlUrl: issue.html_url,
		state: issue.state,
		labels: issue.labels.map((label) => label.name),
		assignees: issue.assignees.map((assignee) => assignee.login),
		comments: comments.map((comment) => ({
			id: comment.id,
			author: comment.user.login,
			body: comment.body,
			createdAt: comment.created_at,
		})),
	};
}

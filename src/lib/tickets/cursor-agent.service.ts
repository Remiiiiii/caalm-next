import { getTicketsRepo } from "./ticket.types";

const API = "https://api.cursor.com/v1";

export type CursorAgentLaunchResult = {
	id: string;
	status: string;
};

export function buildCursorAgentPrompt(input: {
	issueNumber: number;
	issueUrl: string;
	issueTitle: string;
	issueBody: string;
	/** Optional human guidance from the ticket Resolve form */
	instructions?: string;
}): string {
	const guidance = input.instructions?.trim()
		? `\nOperator instructions:\n${input.instructions.trim()}\n`
		: "";

	return `Implement a fix for GitHub issue #${input.issueNumber} (${input.issueUrl}).

Title: ${input.issueTitle}

${input.issueBody}
${guidance}
Requirements:
- Write or update tests that cover the fix.
- Open a pull request with autoCreatePR.
- The PR body MUST include the line: Fixes #${input.issueNumber}
`;
}

export function cursorApiAuthHeader(apiKey: string): string {
	// Cloud Agents API accepts Basic auth: API key as username, empty password
	const token = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
	return `Basic ${token}`;
}

function requireApiKey(): string {
	const apiKey = process.env.CURSOR_API_KEY;
	if (!apiKey) {
		throw new Error("CURSOR_API_KEY is not configured");
	}
	return apiKey;
}

function headers(extra?: Record<string, string>): Record<string, string> {
	return {
		Authorization: cursorApiAuthHeader(requireApiKey()),
		"Content-Type": "application/json",
		...extra,
	};
}

async function failure(label: string, res: Response): Promise<Error> {
	return new Error(`${label}: ${res.status} ${await res.text()}`);
}

export async function launchCursorAgent(input: {
	issueNumber: number;
	issueUrl: string;
	issueTitle: string;
	issueBody: string;
	repoUrl?: string;
	instructions?: string;
}): Promise<CursorAgentLaunchResult> {
	const repo = input.repoUrl || `https://github.com/${getTicketsRepo()}`;
	const res = await fetch(`${API}/agents`, {
		method: "POST",
		headers: headers(),
		body: JSON.stringify({
			prompt: { text: buildCursorAgentPrompt(input) },
			repos: [{ url: repo }],
			autoCreatePR: true,
		}),
	});
	if (!res.ok) throw await failure("Cursor agent launch failed", res);

	const body = (await res.json()) as {
		agent?: { id?: string };
		run?: { status?: string };
		id?: string;
	};
	const id = body.agent?.id ?? body.id;
	if (!id) throw new Error("Cursor agent response was missing the agent id");
	return { id, status: body.run?.status || "CREATING" };
}

type CursorRun = {
	id: string;
	status: string;
	git?: { branches?: Array<{ prUrl?: string }> };
};

/** The agent's most recent run, which carries the status and any pull request. */
export async function getLatestRun(agentId: string): Promise<CursorRun | null> {
	const res = await fetch(`${API}/agents/${encodeURIComponent(agentId)}`, {
		headers: headers(),
	});
	if (!res.ok) throw await failure("Cursor agent status failed", res);
	const agent = (await res.json()) as { latestRunId?: string };
	if (!agent.latestRunId) return null;

	const runRes = await fetch(
		`${API}/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(agent.latestRunId)}`,
		{ headers: headers() },
	);
	if (!runRes.ok) throw await failure("Cursor run status failed", runRes);
	return (await runRes.json()) as CursorRun;
}

/** Run statuses that mean the agent is still working (not finished, stopped or failed). */
const ACTIVE_RUN_STATUSES = new Set([
	"CREATING",
	"RUNNING",
	"ACTIVE",
	"WAITING_FOR_BACKGROUND_WORK",
]);

export function isCursorRunActive(status: string): boolean {
	return ACTIVE_RUN_STATUSES.has(status.toUpperCase());
}

export async function getCursorAgentStatus(agentId: string): Promise<{
	id: string;
	status: string;
	prUrl?: string;
}> {
	const run = await getLatestRun(agentId);
	return {
		id: agentId,
		status: run?.status ?? "CREATING",
		prUrl: run?.git?.branches?.find((branch) => branch.prUrl)?.prUrl,
	};
}

/** Cancels the active run. Cancelling is final; a new run is needed to continue. */
export async function cancelCursorRun(agentId: string): Promise<void> {
	const run = await getLatestRun(agentId);
	if (!run) return;
	const res = await fetch(
		`${API}/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(run.id)}/cancel`,
		// Cursor rejects a JSON content type with an empty body.
		{ method: "POST", headers: headers(), body: "{}" },
	);
	// 409 means the run already finished, which is as good as cancelled.
	if (!res.ok && res.status !== 409) {
		throw await failure("Cursor run cancel failed", res);
	}
}

/** Adds guidance to the running turn, or starts a new run if the agent is idle. */
export async function sendCursorFollowUp(
	agentId: string,
	text: string,
): Promise<void> {
	const url = `${API}/agents/${encodeURIComponent(agentId)}/runs`;
	const send = (body: Record<string, unknown>) =>
		fetch(url, {
			method: "POST",
			headers: headers(),
			body: JSON.stringify(body),
		});

	const steered = await send({ prompt: { text }, delivery: "steer" });
	if (steered.ok) return;
	if (steered.status === 409) {
		// Nothing running to steer: start a fresh run with the message.
		const fresh = await send({ prompt: { text } });
		if (fresh.ok) return;
		throw await failure("Cursor follow-up failed", fresh);
	}
	throw await failure("Cursor follow-up failed", steered);
}

/** Opens the run's server-sent event stream; the caller pipes it to the browser. */
export async function openCursorRunStream(
	agentId: string,
	options: { lastEventId?: string | null; signal?: AbortSignal },
): Promise<Response | null> {
	const run = await getLatestRun(agentId);
	if (!run) return null;
	return fetch(
		`${API}/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(run.id)}/stream`,
		{
			headers: headers({
				Accept: "text/event-stream",
				...(options.lastEventId
					? { "Last-Event-ID": options.lastEventId }
					: {}),
			}),
			signal: options.signal,
		},
	);
}

export function parsePrNumberFromUrl(prUrl: string | undefined): number | null {
	if (!prUrl) return null;
	const match = prUrl.match(/\/pull\/(\d+)/);
	return match ? Number(match[1]) : null;
}

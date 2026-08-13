import { getTicketsRepo } from "./ticket.types";

export type CursorAgentLaunchResult = {
	id: string;
	status: string;
};

export function buildCursorAgentPrompt(input: {
	issueNumber: number;
	issueUrl: string;
	issueTitle: string;
	issueBody: string;
}): string {
	return `Implement a fix for GitHub issue #${input.issueNumber} (${input.issueUrl}).

Title: ${input.issueTitle}

${input.issueBody}

Requirements:
- Write or update tests that cover the fix.
- Open a pull request with autoCreatePR.
- The PR body MUST include the line: Fixes #${input.issueNumber}
`;
}

export async function launchCursorAgent(input: {
	issueNumber: number;
	issueUrl: string;
	issueTitle: string;
	issueBody: string;
	repoUrl?: string;
}): Promise<CursorAgentLaunchResult> {
	const apiKey = process.env.CURSOR_API_KEY;
	if (!apiKey) {
		throw new Error("CURSOR_API_KEY is not configured");
	}

	const repo = input.repoUrl || `https://github.com/${getTicketsRepo()}`;
	const res = await fetch("https://api.cursor.com/v0/agents", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			prompt: {
				text: buildCursorAgentPrompt(input),
			},
			source: { repository: repo },
			target: {
				autoCreatePr: true,
			},
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Cursor agent launch failed: ${res.status} ${text}`);
	}

	const body = (await res.json()) as { id: string; status?: string };
	return { id: body.id, status: body.status || "CREATING" };
}

export async function getCursorAgentStatus(agentId: string): Promise<{
	id: string;
	status: string;
	prUrl?: string;
}> {
	const apiKey = process.env.CURSOR_API_KEY;
	if (!apiKey) {
		throw new Error("CURSOR_API_KEY is not configured");
	}

	const res = await fetch(`https://api.cursor.com/v0/agents/${agentId}`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
	});
	if (!res.ok) {
		throw new Error(`Cursor agent status failed: ${res.status}`);
	}
	const body = (await res.json()) as {
		id: string;
		status: string;
		target?: { prUrl?: string };
	};
	return {
		id: body.id,
		status: body.status,
		prUrl: body.target?.prUrl,
	};
}

export function parsePrNumberFromUrl(prUrl: string | undefined): number | null {
	if (!prUrl) return null;
	const match = prUrl.match(/\/pull\/(\d+)/);
	return match ? Number(match[1]) : null;
}

/**
 * Optional GitHub PR comment helper for cleared-to-merge messages.
 */

export async function postPullRequestComment(params: {
	prNumber: number;
	body: string;
}): Promise<{ posted: boolean; detail: string }> {
	const token = process.env.GITHUB_TOKEN || process.env.ROADMAP_GITHUB_TOKEN;
	const repo =
		process.env.GITHUB_TICKETS_REPO || process.env.ROADMAP_GITHUB_REPO || "";
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
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"Content-Type": "application/json",
				"User-Agent": "caalm-roadmap-engine",
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

export async function fetchPullRequestStatus(params: {
	prNumber: number;
}): Promise<{
	state: "open" | "closed" | "merged" | "unknown";
	htmlUrl?: string;
	title?: string;
}> {
	const token = process.env.GITHUB_TOKEN || process.env.ROADMAP_GITHUB_TOKEN;
	const repo =
		process.env.GITHUB_TICKETS_REPO || process.env.ROADMAP_GITHUB_REPO || "";
	if (!token || !repo.includes("/")) {
		return { state: "unknown" };
	}
	const [owner, name] = repo.split("/");
	const res = await fetch(
		`https://api.github.com/repos/${owner}/${name}/pulls/${params.prNumber}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "caalm-roadmap-engine",
			},
		},
	);
	if (!res.ok) return { state: "unknown" };
	const json = (await res.json()) as {
		state: string;
		merged_at: string | null;
		html_url: string;
		title: string;
	};
	if (json.merged_at) {
		return { state: "merged", htmlUrl: json.html_url, title: json.title };
	}
	if (json.state === "closed") {
		return { state: "closed", htmlUrl: json.html_url, title: json.title };
	}
	return { state: "open", htmlUrl: json.html_url, title: json.title };
}

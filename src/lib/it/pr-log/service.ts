import {
	fetchPullRequestStatus,
	listOpenPullRequests,
} from "@/lib/roadmap/github";
import { buildPrLogOverview, isAgentPullRequestBranch } from "./agent-pr";
import type { PrLogOverview, PrLogPullRequestDetail } from "./types";

export class PrLogError extends Error {
	status: number;
	constructor(message: string, status = 500) {
		super(message);
		this.name = "PrLogError";
		this.status = status;
	}
}

export async function getPrLogOverview(): Promise<PrLogOverview> {
	const prs = await listOpenPullRequests().catch(() => []);
	return buildPrLogOverview(prs);
}

export async function getPrLogPullRequest(
	prNumber: number,
): Promise<PrLogPullRequestDetail> {
	if (!Number.isInteger(prNumber) || prNumber < 1) {
		throw new PrLogError("Invalid pull request number", 400);
	}

	const live = await fetchPullRequestStatus({ prNumber });
	if (live.state === "unknown" || !live.number) {
		throw new PrLogError(`Pull request #${prNumber} was not found`, 404);
	}

	if (!isAgentPullRequestBranch(live.headRef ?? "")) {
		throw new PrLogError(
			`Pull request #${prNumber} is not a cloud agent branch`,
			404,
		);
	}

	return {
		number: live.number,
		title: live.title ?? `PR #${prNumber}`,
		state: live.state,
		htmlUrl: live.htmlUrl ?? "",
		headRef: live.headRef ?? "",
		body: live.body ?? "",
	};
}

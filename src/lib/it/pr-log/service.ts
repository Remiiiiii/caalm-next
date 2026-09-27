import {
	fetchCommitCheckRuns,
	fetchPullRequestStatus,
	listOpenPullRequests,
	listRecentlyClosedPullRequests,
} from "@/lib/roadmap/github";
import {
	buildPrLogOverview,
	isAgentPullRequestBranch,
	type PrLogSourcePr,
} from "./agent-pr";
import { evaluateCommitCheckGate } from "./checks";
import type { PrLogOverview, PrLogPullRequestDetail } from "./types";

export class PrLogError extends Error {
	status: number;
	constructor(message: string, status = 500) {
		super(message);
		this.name = "PrLogError";
		this.status = status;
	}
}

async function enrichMergedAgentPr(pr: PrLogSourcePr): Promise<PrLogSourcePr> {
	const sha =
		pr.mergeCommitSha?.trim() ||
		(await fetchPullRequestStatus({ prNumber: pr.number })).mergeCommitSha ||
		"";
	if (!sha) {
		return {
			...pr,
			checksPassed: false,
			checksReason: "Merged — waiting for a merge commit SHA",
		};
	}
	const runs = await fetchCommitCheckRuns({ commitSha: sha }).catch(() => []);
	const gate = evaluateCommitCheckGate(runs);
	return {
		...pr,
		mergeCommitSha: sha,
		checksPassed: gate.ok,
		checksReason: gate.reason,
	};
}

export async function getPrLogOverview(): Promise<PrLogOverview> {
	const [open, closed] = await Promise.all([
		listOpenPullRequests().catch(() => []),
		listRecentlyClosedPullRequests().catch(() => []),
	]);

	const seen = new Set<number>();
	const combined: PrLogSourcePr[] = [];
	for (const pr of [...open, ...closed]) {
		if (seen.has(pr.number)) continue;
		if (!isAgentPullRequestBranch(pr.headRef)) continue;
		seen.add(pr.number);
		combined.push(pr);
	}

	const enriched = await Promise.all(
		combined.map(async (pr) => {
			if (pr.state !== "merged") return pr;
			return enrichMergedAgentPr(pr);
		}),
	);

	return buildPrLogOverview(enriched);
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

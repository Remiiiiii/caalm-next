/**
 * Decide if a merge commit is finished on GitHub Checks.
 * The PR log keeps a merged agent PR until every check run has completed
 * successfully (or is skipped/neutral). Pending or failed = stay on the list.
 */

export const PASSING_CHECK_CONCLUSIONS = new Set([
	"success",
	"skipped",
	"neutral",
]);

export type CommitCheckRunSummary = {
	name: string;
	status: string;
	conclusion: string | null;
};

export type CommitCheckGate = {
	ok: boolean;
	reason?: string;
};

export function evaluateCommitCheckGate(
	runs: CommitCheckRunSummary[],
): CommitCheckGate {
	if (runs.length === 0) {
		return {
			ok: false,
			reason: "Waiting for GitHub checks to start on the merge commit",
		};
	}

	const incomplete = runs.filter((run) => run.status !== "completed");
	if (incomplete.length > 0) {
		const names = incomplete
			.slice(0, 3)
			.map((run) => run.name)
			.join(", ");
		return {
			ok: false,
			reason: `Waiting for GitHub checks to finish (${names})`,
		};
	}

	const failed = runs.filter(
		(run) => !run.conclusion || !PASSING_CHECK_CONCLUSIONS.has(run.conclusion),
	);
	if (failed.length > 0) {
		const names = failed
			.slice(0, 3)
			.map((run) => run.name)
			.join(", ");
		return {
			ok: false,
			reason: `GitHub checks have not all succeeded (${names})`,
		};
	}

	return { ok: true };
}

import { type NextRequest, NextResponse } from "next/server";
import {
	completeTaskFromMerge,
	recordPassingRecheck,
	RoadmapError,
} from "@/lib/roadmap/service";
import { getTaskByCode, getTaskByPrNumber } from "@/lib/roadmap/store";
import {
	getRoadmapWebhookSecret,
	verifyRoadmapWebhookSignature,
} from "@/lib/roadmap/webhook-security";

export const runtime = "nodejs";

/**
 * Accepts either a slim roadmap payload or a GitHub pull_request.closed body.
 */
export async function POST(request: NextRequest) {
	const secret = getRoadmapWebhookSecret();
	const signature =
		request.headers.get("x-hub-signature-256") ||
		request.headers.get("x-roadmap-signature");
	const payload = await request.text();

	if (!verifyRoadmapWebhookSignature(payload, signature, secret)) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	try {
		const body = JSON.parse(payload) as Record<string, unknown>;

		let prNumber: number | undefined;
		let mergeCommitSha: string | undefined;
		let baseBranch: string | undefined;
		let taskCode: string | undefined;
		let merged = false;

		if (body.pull_request && typeof body.pull_request === "object") {
			const pr = body.pull_request as Record<string, unknown>;
			const action = String(body.action || "");
			merged = action === "closed" && Boolean(pr.merged);
			prNumber = Number(pr.number);
			mergeCommitSha = String(pr.merge_commit_sha || "");
			baseBranch = String(
				(pr.base as { ref?: string } | undefined)?.ref || "main",
			);
			const headRef = String(
				(pr.head as { ref?: string } | undefined)?.ref || "",
			);
			// Prefer explicit taskCode; else parse clm/<section>-<taskCode>-slug
			taskCode =
				typeof body.taskCode === "string"
					? body.taskCode
					: parseTaskCodeFromBranch(headRef);
		} else {
			prNumber = Number(body.prNumber);
			mergeCommitSha = String(body.mergeCommitSha || "");
			baseBranch = String(body.baseBranch || "main");
			taskCode = String(body.taskCode || "");
			merged = true;
		}

		if (!merged) {
			return NextResponse.json({ ok: true, ignored: true, reason: "not merged" });
		}

		if (!prNumber || !mergeCommitSha || !taskCode) {
			return NextResponse.json(
				{ error: "Missing prNumber, mergeCommitSha, or taskCode" },
				{ status: 400 },
			);
		}

		// If CI already posted a pass for this exact sha under pr_update, completeTaskFromMerge uses it.
		// Optional: allow webhook to include recheckPassed=true for test harnesses.
		if (body.recheckPassed === true) {
			const task =
				(await getTaskByCode(taskCode)) ||
				(await getTaskByPrNumber(prNumber));
			if (task) {
				await recordPassingRecheck({
					taskId: task.$id,
					prNumber,
					commitSha: mergeCommitSha,
					summary: "Merge webhook supplied recheckPassed",
				});
			}
		}

		const outcome = await completeTaskFromMerge({
			prNumber,
			mergeCommitSha,
			baseBranch,
			taskCode,
		});

		return NextResponse.json({
			ok: true,
			completed: outcome.completed,
			reason: outcome.reason,
			taskId: outcome.task.$id,
			status: outcome.task.status,
		});
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/webhooks/pr-merged:", error);
		return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
	}
}

function parseTaskCodeFromBranch(branch: string): string | undefined {
	// clm/0-0.1-data-model  or  clm/1-1.3-dismiss-authz
	const m = branch.match(/^clm\/\d+-(\d+(?:\.\d+)+)-/i);
	return m?.[1];
}

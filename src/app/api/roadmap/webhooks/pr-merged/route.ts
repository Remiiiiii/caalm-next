import { type NextRequest, NextResponse } from "next/server";
import { getSectionNumberForPr } from "@/lib/roadmap/catalog";
import {
	completeSectionFromMerge,
	recordPassingRecheck,
	RoadmapError,
} from "@/lib/roadmap/service";
import { listSections, listTasks, getTasksByPrNumber } from "@/lib/roadmap/store";
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
		} else {
			prNumber = Number(body.prNumber);
			mergeCommitSha = String(body.mergeCommitSha || "");
			baseBranch = String(body.baseBranch || "main");
			merged = true;
		}

		if (!merged) {
			return NextResponse.json({
				ok: true,
				ignored: true,
				reason: "not merged",
			});
		}

		if (!prNumber || !mergeCommitSha) {
			return NextResponse.json(
				{ error: "Missing prNumber or mergeCommitSha" },
				{ status: 400 },
			);
		}

		if (body.recheckPassed === true) {
			const owners = await getTasksByPrNumber(prNumber);
			const owner = owners[0] ?? (await firstTaskForPr(prNumber));
			if (owner) {
				await recordPassingRecheck({
					taskId: owner.$id,
					prNumber,
					commitSha: mergeCommitSha,
					summary: "Merge webhook supplied recheckPassed",
				});
			}
		}

		const outcome = await completeSectionFromMerge({
			prNumber,
			mergeCommitSha,
			baseBranch,
		});

		return NextResponse.json({
			ok: true,
			completed: outcome.completed,
			reason: outcome.reason,
			sectionNumber: outcome.sectionNumber,
			status: outcome.completed ? "complete" : "locked",
		});
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("[SERVER] roadmap/webhooks/pr-merged:", error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 },
		);
	}
}

async function firstTaskForPr(prNumber: number) {
	const sectionNumber = getSectionNumberForPr(prNumber);
	if (sectionNumber == null) return null;
	const sections = await listSections();
	const section = sections.find((s) => s.sectionNumber === sectionNumber);
	if (!section) return null;
	const tasks = await listTasks();
	return (
		tasks
			.filter((t) => t.sectionId === section.$id && !t.parentTaskId)
			.sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? null
	);
}

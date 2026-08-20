import { type NextRequest, NextResponse } from "next/server";
import { postPullRequestComment } from "@/lib/roadmap/github";
import { recordCiTestResult, RoadmapError } from "@/lib/roadmap/service";
import {
	getRoadmapWebhookSecret,
	verifyRoadmapWebhookSignature,
} from "@/lib/roadmap/webhook-security";

export const runtime = "nodejs";

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
		const body = JSON.parse(payload) as {
			prNumber?: number;
			commitSha?: string;
			taskCode?: string;
			result?: "passed" | "failed" | "error";
			logsUrl?: string;
			summary?: string;
		};

		if (
			!body.prNumber ||
			!body.commitSha ||
			!body.taskCode ||
			!body.result ||
			!body.logsUrl ||
			!body.summary
		) {
			return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
		}

		const outcome = await recordCiTestResult({
			prNumber: body.prNumber,
			commitSha: body.commitSha,
			taskCode: body.taskCode,
			result: body.result,
			logsUrl: body.logsUrl,
			summary: body.summary,
		});

		const comment = await postPullRequestComment({
			prNumber: body.prNumber,
			body: outcome.commentBody,
		});

		return NextResponse.json({
			ok: true,
			clearedToMerge: outcome.clearedToMerge,
			taskId: outcome.task.$id,
			testRunId: outcome.testRun.$id,
			comment,
		});
	} catch (error) {
		if (error instanceof RoadmapError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] roadmap/webhooks/ci-test-result:", error);
		return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
	}
}

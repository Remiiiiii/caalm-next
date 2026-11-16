import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { listQuestions, listScripts } from "@/lib/audit-lab/repository";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.VIEW,
	});
	if (denied) return denied;

	const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
	if (!sessionId) {
		return NextResponse.json(
			{ error: "sessionId is required" },
			{ status: 400 },
		);
	}

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	try {
		const [questions, scripts] = await Promise.all([
			listQuestions(resolved.actor.orgId, sessionId),
			listScripts(resolved.actor.orgId, sessionId),
		]);
		const latest = scripts[0] ?? null;
		return NextResponse.json({
			data: {
				questions,
				script: latest,
				version: latest?.version ?? 0,
			},
		});
	} catch (error) {
		console.error("[SERVER] GET /api/audit-lab/interview/bank", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not load the interview bank. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
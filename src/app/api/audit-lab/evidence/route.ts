import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import {
	assignEvidenceOwner,
	evidenceCoverageReport,
	generateEvidenceRequestList,
	updateEvidenceStatus,
	whoOwnsEvidence,
} from "@/lib/audit-lab/service";
import type { EvidenceStatus } from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.VIEW,
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	try {
		const { searchParams } = new URL(request.url);
		const sessionId = searchParams.get("sessionId") ?? undefined;
		const requestId = searchParams.get("requestId");
		if (requestId) {
			const result = await whoOwnsEvidence(resolved.actor.orgId, requestId);
			if ("error" in result && result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		const report = await evidenceCoverageReport(
			resolved.actor.orgId,
			sessionId,
		);
		return NextResponse.json({ data: report });
	} catch (error) {
		console.error("[SERVER] GET /api/audit-lab/evidence:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't load evidence coverage. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.MANAGE_EVIDENCE,
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	try {
		const body = (await request.json()) as {
			action?: string;
			sessionId?: string;
			requestId?: string;
			ownerUserId?: string;
			assigneeUserId?: string;
			managerUserId?: string;
			status?: EvidenceStatus;
			note?: string;
		};
		const action = String(body.action ?? "generate");
		if (action === "assign") {
			const result = await assignEvidenceOwner(
				resolved.actor,
				String(body.requestId ?? ""),
				String(body.ownerUserId ?? ""),
				body.assigneeUserId,
				body.managerUserId,
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		if (action === "status") {
			const result = await updateEvidenceStatus(
				resolved.actor,
				String(body.requestId ?? ""),
				body.status as EvidenceStatus,
				body.note,
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		const result = await generateEvidenceRequestList(
			resolved.actor,
			String(body.sessionId ?? ""),
		);
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result });
	} catch (error) {
		console.error("[SERVER] POST /api/audit-lab/evidence:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't update the evidence matrix. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}

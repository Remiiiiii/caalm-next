import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { toCsv } from "@/lib/audit-lab/csv";
import { departmentTrendSummary } from "@/lib/audit-lab/reports";
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
		const summary = await departmentTrendSummary(resolved.actor.orgId);
		const rows = Object.entries(summary.byDepartment).map(([name, stats]) => ({
			department: name,
			sessions: stats.sessions,
			evidence_total: stats.total,
			evidence_accepted: stats.accepted,
			coverage_pct:
				stats.total === 0
					? 0
					: Math.round((stats.accepted / stats.total) * 100),
		}));
		const csv = toCsv(
			[
				"department",
				"sessions",
				"evidence_total",
				"evidence_accepted",
				"coverage_pct",
			],
			rows,
		);
		return new NextResponse(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition":
					'attachment; filename="audit-lab-department-readiness.csv"',
			},
		});
	} catch (error) {
		console.error("[SERVER] GET /api/audit-lab/reports/export", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not export the readiness summary. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
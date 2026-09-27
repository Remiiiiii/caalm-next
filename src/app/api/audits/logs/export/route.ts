import { type NextRequest, NextResponse } from "next/server";
import type { AuditModule } from "@/lib/audits/audit-log.utils";
import { PERMISSIONS } from "@/constants/permissions";
import { exportAuditLogsAction } from "@/lib/actions/audit.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { getAuditLogs } from "@/lib/services/audit-logger";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.AUDIT.EXPORT,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId || "default_organization";
		const { searchParams } = new URL(request.url);
		const format = searchParams.get("format") || "csv";

		const moduleParam = searchParams.get("module");
		const module =
			moduleParam && moduleParam !== "all"
				? (moduleParam as AuditModule)
				: undefined;

		const filters = {
			orgId,
			startDate: searchParams.get("startDate") || undefined,
			endDate: searchParams.get("endDate") || undefined,
			userId: searchParams.get("userId") || undefined,
			action: searchParams.get("action") || undefined,
			status: searchParams.get("status") || undefined,
			search: searchParams.get("search") || undefined,
			module,
			limit: 5000,
			offset: 0,
		};

		if (format === "json") {
			const logs = await getAuditLogs(filters);
			return NextResponse.json({ success: true, logs });
		}

		const csv = await exportAuditLogsAction(filters);
		return new NextResponse(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
			},
		});
	} catch (error) {
		console.error("[SERVER] Error exporting audit logs:", error);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error ? error.message : "Failed to export audit logs",
			},
			{ status: 500 },
		);
	}
}

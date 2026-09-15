import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireStepUp } from "@/lib/auth/step-up";
import {
	buildTenantExport,
	manifestMatchesCollections,
	tenantExportFilename,
} from "@/lib/portability/tenant-export.service";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const stepUpCheck = requireStepUp(request, user.$id);
		if (stepUpCheck) return stepUpCheck;

		const { searchParams } = new URL(request.url);
		const orgIdParam = searchParams.get("orgId");
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = orgIdParam || defaultOrg?.orgId;
		if (!orgId) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		const org = await getOrganization(orgId);
		if (!org) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		const payload = await buildTenantExport(orgId);
		if (!manifestMatchesCollections(payload)) {
			return NextResponse.json(
				{ error: "Export counts did not match source rows" },
				{ status: 500 },
			);
		}

		const manifestCounts = Object.fromEntries(
			Object.entries(payload.manifest).map(([key, entry]) => [
				key,
				entry.error ? { count: entry.count, error: true } : entry.count,
			]),
		);

		await logAuditEvent({
			event_id: `org_export_${orgId}_${Date.now()}`,
			event_title: `Tenant data exported: ${org.name || orgId}`,
			action: "export",
			source: "caalm",
			user_id: user.$id,
			user_name:
				(user as { fullName?: string }).fullName || user.email || "unknown",
			user_email: user.email || "",
			status: "success",
			orgId,
			module: "system",
			target_type: "organization",
			target_id: orgId,
			target_label: org.name,
			summary: `${(user as { fullName?: string }).fullName || user.email} exported tenant data`,
			metadata: {
				schemaVersion: payload.schemaVersion,
				manifestCounts,
			},
		}).catch(() => undefined);

		const filename = tenantExportFilename(orgId, payload.exportedAt);
		return new NextResponse(JSON.stringify(payload), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error("[organizations/data-export] POST:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to export tenant data",
			},
			{ status: 500 },
		);
	}
}

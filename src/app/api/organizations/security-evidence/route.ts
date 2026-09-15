import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireStepUp } from "@/lib/auth/step-up";
import {
	buildSecurityEvidencePack,
	evidencePackCrossReferencesCompletedTasks,
	evidencePackFilename,
} from "@/lib/portability/security-evidence-pack";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

/**
 * Download a security questionnaire evidence pack for controls that exist in code.
 * Permission: settings.edit (PERMISSIONS.SETTINGS.EDIT)
 */
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

		const payload = buildSecurityEvidencePack({ orgId });
		if (!evidencePackCrossReferencesCompletedTasks(payload)) {
			return NextResponse.json(
				{
					error: "Evidence pack controls are missing roadmap cross-references",
				},
				{ status: 500 },
			);
		}

		await logAuditEvent({
			event_id: `org_evidence_${orgId}_${Date.now()}`,
			event_title: `Security evidence pack exported: ${org.name || orgId}`,
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
			summary: `${(user as { fullName?: string }).fullName || user.email} downloaded security evidence pack`,
			metadata: {
				schemaVersion: payload.schemaVersion,
				controlCount: payload.controls.length,
			},
		}).catch(() => undefined);

		const filename = evidencePackFilename(orgId, payload.generatedAt);
		return new NextResponse(JSON.stringify(payload, null, 2), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error("[organizations/security-evidence] POST:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to build evidence pack",
			},
			{ status: 500 },
		);
	}
}

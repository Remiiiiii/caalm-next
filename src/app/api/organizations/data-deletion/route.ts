import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireStepUp } from "@/lib/auth/step-up";
import {
	buildDeletionCancelSettings,
	buildDeletionRequestSettings,
	parseOrgSettings,
	readTenantDeletionSettings,
	TENANT_DELETION_GRACE_DAYS,
} from "@/lib/portability/tenant-deletion-notice";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization, updateOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

async function resolveOrgId(
	request: NextRequest,
	userId: string,
): Promise<string | null> {
	const { searchParams } = new URL(request.url);
	const orgIdParam = searchParams.get("orgId");
	if (orgIdParam) return orgIdParam;
	const defaultOrg = await getUserDefaultOrganization(userId);
	return defaultOrg?.orgId ?? null;
}

/** Schedule tenant deletion after a grace period. */
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

		const orgId = await resolveOrgId(request, user.$id);
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

		const existingSettings = parseOrgSettings(org.settings);
		const current = readTenantDeletionSettings(existingSettings);
		if (current.deletionScheduledAt) {
			return NextResponse.json({
				success: true,
				alreadyScheduled: true,
				deletionScheduledAt: current.deletionScheduledAt,
				graceDays: TENANT_DELETION_GRACE_DAYS,
			});
		}

		const requestedAt = new Date();
		const nextSettings = buildDeletionRequestSettings({
			existingSettings: {
				maxUsers: org.settings?.maxUsers ?? 10,
				maxDepartments: org.settings?.maxDepartments ?? 3,
				features: org.settings?.features ?? [],
				...existingSettings,
			},
			requestedAt,
			userId: user.$id,
			userEmail: user.email || "",
		});

		const updated = await updateOrganization(orgId, {
			settings: nextSettings as {
				maxUsers: number;
				maxDepartments: number;
				features: string[];
				[key: string]: unknown;
			},
		});
		if (!updated) {
			return NextResponse.json(
				{ error: "Failed to schedule deletion" },
				{ status: 500 },
			);
		}

		const deletion = readTenantDeletionSettings(
			parseOrgSettings(updated.settings),
		);

		await logAuditEvent({
			event_id: `org_deletion_request_${orgId}_${Date.now()}`,
			event_title: `Tenant deletion requested: ${org.name || orgId}`,
			action: "delete",
			source: "caalm",
			user_id: user.$id,
			user_name:
				(user as { fullName?: string }).fullName || user.email || "unknown",
			user_email: user.email || "",
			status: "pending",
			orgId,
			module: "system",
			target_type: "organization",
			target_id: orgId,
			target_label: org.name,
			summary: `${(user as { fullName?: string }).fullName || user.email} scheduled tenant deletion after ${TENANT_DELETION_GRACE_DAYS} days`,
			metadata: {
				deletionScheduledAt: deletion.deletionScheduledAt,
				graceDays: TENANT_DELETION_GRACE_DAYS,
			},
		}).catch(() => undefined);

		return NextResponse.json({
			success: true,
			deletionRequestedAt: deletion.deletionRequestedAt,
			deletionScheduledAt: deletion.deletionScheduledAt,
			graceDays: TENANT_DELETION_GRACE_DAYS,
		});
	} catch (error) {
		console.error("[organizations/data-deletion] POST:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to schedule tenant deletion",
			},
			{ status: 500 },
		);
	}
}

/** Cancel a pending tenant deletion during the grace period. */
export async function DELETE(request: NextRequest) {
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

		const orgId = await resolveOrgId(request, user.$id);
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

		const existingSettings = parseOrgSettings(org.settings);
		const current = readTenantDeletionSettings(existingSettings);
		if (!current.deletionScheduledAt) {
			return NextResponse.json({
				success: true,
				alreadyCancelled: true,
			});
		}

		const nextSettings = buildDeletionCancelSettings({
			maxUsers: org.settings?.maxUsers ?? 10,
			maxDepartments: org.settings?.maxDepartments ?? 3,
			features: org.settings?.features ?? [],
			...existingSettings,
		});

		const updated = await updateOrganization(orgId, {
			settings: nextSettings as {
				maxUsers: number;
				maxDepartments: number;
				features: string[];
				[key: string]: unknown;
			},
		});
		if (!updated) {
			return NextResponse.json(
				{ error: "Failed to cancel deletion" },
				{ status: 500 },
			);
		}

		await logAuditEvent({
			event_id: `org_deletion_cancel_${orgId}_${Date.now()}`,
			event_title: `Tenant deletion cancelled: ${org.name || orgId}`,
			action: "update",
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
			summary: `${(user as { fullName?: string }).fullName || user.email} cancelled scheduled tenant deletion`,
		}).catch(() => undefined);

		return NextResponse.json({ success: true, cancelled: true });
	} catch (error) {
		console.error("[organizations/data-deletion] DELETE:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to cancel tenant deletion",
			},
			{ status: 500 },
		);
	}
}

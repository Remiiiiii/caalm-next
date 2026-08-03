import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization, updateOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

const updateOrgSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	domain: z.string().max(255).optional().nullable(),
	settings: z
		.object({
			maxUsers: z.number().int().min(1).max(100000).optional(),
			maxDepartments: z.number().int().min(1).max(1000).optional(),
			features: z.array(z.string()).optional(),
		})
		.optional(),
});

export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.SETTINGS.VIEW,
		});
		if (permissionCheck) return permissionCheck;

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

		return NextResponse.json({ success: true, data: { organization: org } });
	} catch (error) {
		console.error("Organization GET error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch organization",
			},
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.SETTINGS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

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

		const existing = await getOrganization(orgId);
		if (!existing) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		const validated = updateOrgSchema.parse(body);

		const settings = validated.settings
			? {
					maxUsers:
						validated.settings.maxUsers ?? existing.settings.maxUsers ?? 10,
					maxDepartments:
						validated.settings.maxDepartments ??
						existing.settings.maxDepartments ??
						3,
					features:
						validated.settings.features ?? existing.settings.features ?? [],
					...existing.settings,
					...(validated.settings.maxUsers !== undefined
						? { maxUsers: validated.settings.maxUsers }
						: {}),
					...(validated.settings.maxDepartments !== undefined
						? { maxDepartments: validated.settings.maxDepartments }
						: {}),
					...(validated.settings.features !== undefined
						? { features: validated.settings.features }
						: {}),
				}
			: undefined;

		const updated = await updateOrganization(orgId, {
			name: validated.name,
			domain: validated.domain === null ? undefined : validated.domain,
			settings,
		});

		await logAuditEvent({
			event_id: `org_update_${orgId}`,
			event_title: `Organization updated: ${updated?.name || orgId}`,
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
			target_label: updated?.name,
			summary: `${(user as { fullName?: string }).fullName || user.email} updated organization settings`,
		}).catch(() => undefined);

		return NextResponse.json({
			success: true,
			data: { organization: updated },
		});
	} catch (error) {
		console.error("Organization PUT error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to update organization",
			},
			{ status: error instanceof z.ZodError ? 400 : 500 },
		);
	}
}

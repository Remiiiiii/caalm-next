import { type NextRequest, NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requireStepUp } from "@/lib/auth/step-up";
import {
	getOrgLogoUrl,
	isAllowedOrgLogoMime,
	ORG_LOGO_MAX_BYTES,
	resolveOrgLogoFileId,
} from "@/lib/organizations/org-logo";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization, updateOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";

async function resolveTargetOrgId(
	request: NextRequest,
	userId: string,
): Promise<string | null> {
	const { searchParams } = new URL(request.url);
	const orgIdParam = searchParams.get("orgId");
	if (orgIdParam) return orgIdParam;
	const defaultOrg = await getUserDefaultOrganization(userId);
	return defaultOrg?.orgId ?? null;
}

/**
 * Upload an optional company logo for agreement letterheads.
 * Permission: settings.edit (PERMISSIONS.SETTINGS.EDIT)
 */
export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	try {
		if (
			!appwriteConfig.organizationLogosBucketId ||
			!appwriteConfig.databaseId
		) {
			return NextResponse.json(
				{ error: "Organization logo storage is not configured" },
				{ status: 500 },
			);
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const stepUpCheck = requireStepUp(request, user.$id);
		if (stepUpCheck) return stepUpCheck;

		const orgId = await resolveTargetOrgId(request, user.$id);
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

		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) {
			return NextResponse.json({ error: "File is required" }, { status: 400 });
		}

		if (!isAllowedOrgLogoMime(file.type)) {
			return NextResponse.json(
				{ error: "Use a PNG, JPG, GIF, WebP, or SVG image" },
				{ status: 400 },
			);
		}

		if (file.size > ORG_LOGO_MAX_BYTES) {
			return NextResponse.json(
				{ error: "Logo must be 5 MB or smaller" },
				{ status: 400 },
			);
		}

		const { storage } = await createAdminClient();
		const bucketId = appwriteConfig.organizationLogosBucketId;
		const previousFileId = resolveOrgLogoFileId(existing.settings);

		const arrayBuffer = await file.arrayBuffer();
		const inputFile = InputFile.fromBuffer(Buffer.from(arrayBuffer), file.name);
		const uploaded = await storage.createFile({
			bucketId,
			fileId: ID.unique(),
			file: inputFile,
		});

		const updated = await updateOrganization(orgId, {
			settings: {
				...existing.settings,
				maxUsers: existing.settings?.maxUsers ?? 10,
				maxDepartments: existing.settings?.maxDepartments ?? 3,
				features: existing.settings?.features ?? [],
				logoFileId: uploaded.$id,
			},
		});

		if (previousFileId && previousFileId !== uploaded.$id) {
			try {
				await storage.deleteFile({ bucketId, fileId: previousFileId });
			} catch (cleanupError) {
				console.warn(
					"[SERVER] organizations/logo POST: could not delete previous logo",
					cleanupError,
				);
			}
		}

		await logAuditEvent({
			event_id: `org_logo_upload_${orgId}`,
			event_title: `Organization logo uploaded: ${existing.name}`,
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
			target_label: existing.name,
			summary: `${(user as { fullName?: string }).fullName || user.email} uploaded organization logo`,
		}).catch(() => undefined);

		return NextResponse.json({
			success: true,
			fileId: uploaded.$id,
			imageUrl: getOrgLogoUrl(uploaded.$id),
			data: { organization: updated },
		});
	} catch (error) {
		console.error("[SERVER] organizations/logo POST:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to upload organization logo",
			},
			{ status: 500 },
		);
	}
}

/**
 * Remove the optional company logo from the organization profile.
 * Permission: settings.edit (PERMISSIONS.SETTINGS.EDIT)
 */
export async function DELETE(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	try {
		if (
			!appwriteConfig.organizationLogosBucketId ||
			!appwriteConfig.databaseId
		) {
			return NextResponse.json(
				{ error: "Organization logo storage is not configured" },
				{ status: 500 },
			);
		}

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const stepUpCheck = requireStepUp(request, user.$id);
		if (stepUpCheck) return stepUpCheck;

		const orgId = await resolveTargetOrgId(request, user.$id);
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

		const previousFileId = resolveOrgLogoFileId(existing.settings);
		const { storage } = await createAdminClient();
		const bucketId = appwriteConfig.organizationLogosBucketId;

		if (previousFileId) {
			try {
				await storage.deleteFile({ bucketId, fileId: previousFileId });
			} catch (cleanupError) {
				console.warn(
					"[SERVER] organizations/logo DELETE: could not delete storage file",
					cleanupError,
				);
			}
		}

		const nextSettings = {
			...existing.settings,
			maxUsers: existing.settings?.maxUsers ?? 10,
			maxDepartments: existing.settings?.maxDepartments ?? 3,
			features: existing.settings?.features ?? [],
		};
		delete nextSettings.logoFileId;

		const updated = await updateOrganization(orgId, {
			settings: nextSettings,
		});

		await logAuditEvent({
			event_id: `org_logo_remove_${orgId}`,
			event_title: `Organization logo removed: ${existing.name}`,
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
			target_label: existing.name,
			summary: `${(user as { fullName?: string }).fullName || user.email} removed organization logo`,
		}).catch(() => undefined);

		return NextResponse.json({
			success: true,
			data: { organization: updated },
		});
	} catch (error) {
		console.error("[SERVER] organizations/logo DELETE:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to remove organization logo",
			},
			{ status: 500 },
		);
	}
}

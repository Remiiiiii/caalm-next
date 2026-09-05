import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import { licenseCreateSchema } from "@/lib/api/licenses/schemas/license.schema";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import {
	errorResponse,
	generateRequestId,
	notFoundResponse,
	successResponse,
} from "@/lib/api/licenses/utils/response.util";
import { requirePermission } from "@/lib/rbac/middleware";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.VIEW,
		});
		if (permissionCheck) return permissionCheck;

		const { id } = await params;

		const license = await LicenseService.getLicenseById(id);

		if (!license) {
			return notFoundResponse("License", requestId);
		}

		return successResponse({ license }, { requestId });
	} catch (error) {
		console.error("Get license error:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to fetch license"),
			500,
			{ requestId },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const { id } = await params;
		const body = await request.json();
		const validatedData = licenseCreateSchema.partial().parse(body);
		const user = await getCurrentUser();

		const license = await LicenseService.updateLicense(id, validatedData);

		if (user) {
			const licenseLabel =
				(license as { name?: string; title?: string })?.name ||
				(license as { title?: string })?.title ||
				id;
			await logAuditEvent({
				event_id: `license_update_${id}`,
				event_title: `License updated: ${licenseLabel}`,
				action: "update",
				source: "caalm",
				user_id: user.$id,
				user_name:
					(user as { fullName?: string }).fullName || user.email || "unknown",
				user_email: user.email || "",
				status: "success",
				module: "licenses",
				target_type: "license",
				target_id: id,
				target_label: licenseLabel,
				summary: `${(user as { fullName?: string }).fullName || user.email} updated license ${licenseLabel}`,
				correlation_id: requestId,
				metadata: { updatedFields: Object.keys(validatedData) },
			});
		}

		return successResponse(
			{ license },
			{ requestId, message: "License updated successfully" },
		);
	} catch (error) {
		console.error("Update license error:", error);

		if (error instanceof Error && error.name === "ZodError") {
			return errorResponse("Validation failed", 400, {
				requestId,
				details: (error as any).errors,
			});
		}

		return errorResponse(
			error instanceof Error ? error : new Error("Failed to update license"),
			500,
			{ requestId },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.LICENSES.DELETE,
		});
		if (permissionCheck) return permissionCheck;

		const { id } = await params;
		const user = await getCurrentUser();
		const deletedByName =
			(user as { fullName?: string } | null)?.fullName ||
			user?.email ||
			"A user";

		const license = await LicenseService.deleteLicense(id, user?.$id, {
			deletedByName,
			deletedByAccountId: user?.accountId,
		});
		const licenseLabel =
			(license as { licenseName?: string })?.licenseName || id;

		revalidateTag("licenses-list");
		revalidatePath("/licenses");

		if (user) {
			const userName =
				(user as { fullName?: string }).fullName || user.email || "unknown";
			await logAuditEvent({
				event_id: `license_delete_${id}`,
				event_title: `License deleted: ${licenseLabel}`,
				action: "delete",
				source: "caalm",
				user_id: user.$id,
				user_name: userName,
				user_email: user.email || "",
				status: "success",
				module: "licenses",
				target_type: "license",
				target_id: id,
				target_label: licenseLabel,
				summary: `${userName} deleted license ${licenseLabel}`,
				correlation_id: requestId,
			});
		}

		return successResponse(
			{ success: true },
			{ requestId, message: "License deleted successfully" },
		);
	} catch (error) {
		console.error("Delete license error:", error);
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to delete license"),
			500,
			{ requestId },
		);
	}
}

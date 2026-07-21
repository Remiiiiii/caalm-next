import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import { licenseRenewalSchema } from "@/lib/api/licenses/schemas/license.schema";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/licenses/utils/response.util";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const requestId = generateRequestId();
	try {
		const authError = await requireAuth(request);
		if (authError) return authError;

		const user = await getCurrentUser();
		if (!user) {
			return errorResponse("User not found", 401, { requestId });
		}

		const { id } = await params;
		const body = await request.json();
		const validatedData = licenseRenewalSchema.parse(body);

		const license = await LicenseService.renewLicense(id, {
			renewalDate: validatedData.renewalDate,
			currencyCode: validatedData.currencyCode,
			notes: validatedData.notes,
			extendExpiration: validatedData.extendExpiration,
			cost:
				validatedData.cost !== undefined
					? Number(validatedData.cost)
					: undefined,
			renewedBy: user.$id,
		});

		const licenseLabel =
			(license as { name?: string; title?: string })?.name ||
			(license as { title?: string })?.title ||
			id;
		await logAuditEvent({
			event_id: `license_renew_${id}`,
			event_title: `License renewed: ${licenseLabel}`,
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
			summary: `${(user as { fullName?: string }).fullName || user.email} renewed license ${licenseLabel}`,
			correlation_id: requestId,
		});

		return successResponse(
			{ license },
			{ requestId, message: "License renewed successfully" },
		);
	} catch (error) {
		console.error("Renew license error:", error);

		if (error instanceof Error && error.name === "ZodError") {
			return errorResponse("Validation failed", 400, {
				requestId,
				details: (error as any).errors,
			});
		}

		return errorResponse(
			error instanceof Error ? error : new Error("Failed to renew license"),
			500,
			{ requestId },
		);
	}
}

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
			...validatedData,
			renewedBy: user.$id,
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

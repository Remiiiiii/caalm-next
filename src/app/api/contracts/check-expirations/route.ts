import { checkContractExpirations } from "@/lib/actions/notification.actions";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/contracts/utils/response.util";

export async function POST() {
	const requestId = generateRequestId();
	// Note: This is typically called by a cron job, auth handled by cron secret
	// For manual calls, we could add auth here if needed
	try {
		const result = await checkContractExpirations();
		return successResponse(
			{ notificationsCreated: result?.notificationsCreated || 0 },
			{ requestId },
		);
	} catch (error) {
		console.error("Failed to check contract expirations:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to check contract expirations"),
			500,
			{ requestId },
		);
	}
}

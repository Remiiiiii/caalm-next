import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkContractExpirations } from "@/lib/actions/notification.actions";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/contracts/utils/response.util";
import { isAuthorizedCron } from "@/lib/cron/is-authorized-cron";

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
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

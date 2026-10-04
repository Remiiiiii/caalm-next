import { type NextRequest, NextResponse } from "next/server";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/contracts/utils/response.util";
import { isAuthorizedCron } from "@/lib/cron/is-authorized-cron";
import { contractExpiryService } from "@/lib/services/contractExpiryService";

export async function POST(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		await contractExpiryService.checkContractExpiry();

		return NextResponse.json({
			success: true,
			message: "Contract expiry check completed successfully",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error during contract expiry check:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to check contract expiry",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const requestId = generateRequestId();
	try {
		return successResponse(
			{
				message: "Contract expiry check endpoint is available",
				usage:
					"POST to this endpoint to manually trigger contract expiry checks",
			},
			{ requestId },
		);
	} catch (error) {
		return errorResponse(
			error instanceof Error ? error : new Error("Failed to get endpoint info"),
			500,
			{ requestId },
		);
	}
}

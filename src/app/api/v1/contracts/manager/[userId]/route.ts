import type { NextRequest } from "next/server";
import { getContractsForManager } from "@/lib/actions/file.actions";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	const requestId = generateRequestId();
	// Authentication and verify user can access this manager's contracts
	const authError = await requireAuth(request);
	if (authError) return authError;

	try {
		const { userId } = await params;
		console.log("Fetching contracts for manager:", userId, { requestId });

		const contracts = await getContractsForManager(userId);
		console.log("Contracts fetched for manager:", contracts?.length || 0);

		return successResponse(contracts || [], { requestId });
	} catch (error) {
		console.error("Error fetching manager contracts:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to fetch manager contracts"),
			500,
			{ requestId },
		);
	}
}

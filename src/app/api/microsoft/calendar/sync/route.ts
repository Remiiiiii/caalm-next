import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import {
	type SyncOutlookCalendarStrategy,
	syncOutlookCalendarForUser,
} from "@/lib/microsoft/calendar-sync.service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC,
	});
	if (denied) return denied;

	let userId: string;
	try {
		userId = await getCurrentUserId();
	} catch {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const body = await request
		.json()
		.catch(() => ({}) as Record<string, unknown>);
	const { startDate, endDate, strategy } = body as {
		startDate?: string;
		endDate?: string;
		strategy?: SyncOutlookCalendarStrategy;
	};

	console.log("Sync request for user:", userId);

	const outcome = await syncOutlookCalendarForUser(userId, {
		startDate: startDate ? new Date(startDate) : undefined,
		endDate: endDate ? new Date(endDate) : undefined,
		strategy,
	});

	const { httpStatus, ...payload } = outcome;
	return NextResponse.json(payload, { status: httpStatus });
}

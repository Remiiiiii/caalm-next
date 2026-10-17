import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCalendarPinnedNotes } from "@/lib/actions/notes.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

/**
 * Notes pinned to calendar days for the signed-in user.
 * Permission: calendar.view_own (PERMISSIONS.CALENDAR.VIEW_OWN)
 */

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CALENDAR.VIEW_OWN,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg?.orgId) {
			return NextResponse.json(
				{ success: false, error: "No organization found for user" },
				{ status: 400 },
			);
		}

		const { searchParams } = new URL(request.url);
		const now = new Date();
		const year = Number.parseInt(
			searchParams.get("year") || String(now.getFullYear()),
			10,
		);
		const month = Number.parseInt(
			searchParams.get("month") || String(now.getMonth() + 1),
			10,
		);

		if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
			return NextResponse.json(
				{ success: false, error: "year and month are required (month 1–12)" },
				{ status: 400 },
			);
		}

		const pins = await getCalendarPinnedNotes(
			user.$id,
			defaultOrg.orgId,
			year,
			month,
		);

		return NextResponse.json({ success: true, pins });
	} catch (error) {
		console.error("[GET /api/notes/calendar-pins]", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to load calendar notes",
			},
			{ status: 500 },
		);
	}
}

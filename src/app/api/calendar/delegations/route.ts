import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	type CreateDelegationData,
	createCalendarDelegation,
	getActiveDelegationsForUser,
} from "@/lib/actions/shared-calendar.actions";
import { getUserByAccountId } from "@/lib/actions/user.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * GET /api/calendar/delegations
 * Get active delegations for the current user
 */
export async function GET(_request: NextRequest) {
	try {
		const userId = await getCurrentUserId();

		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Authentication required" },
				{ status: 401 },
			);
		}

		const user = await getUserByAccountId(userId);
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 },
			);
		}

		const delegations = await getActiveDelegationsForUser(user.$id);

		return NextResponse.json({
			success: true,
			delegations,
			total: delegations.length,
		});
	} catch (error) {
		console.error("[SERVER] GET /api/calendar/delegations] Error:", error);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to fetch delegations",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/calendar/delegations
 * Create a new calendar delegation
 */
export async function POST(request: NextRequest) {
	try {
		// Check permission
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.CALENDAR.EDIT_ALL,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const userId = await getCurrentUserId();

		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Authentication required" },
				{ status: 401 },
			);
		}

		const user = await getUserByAccountId(userId);
		if (!user) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		const delegationData: CreateDelegationData = {
			calendarId: body.calendarId,
			delegatorId: user.$id, // Current user is delegating
			delegateId: body.delegateId,
			permissions: body.permissions || ["view"],
			canCreateEvents: body.canCreateEvents || false,
			canEditEvents: body.canEditEvents || false,
			canDeleteEvents: body.canDeleteEvents || false,
			canManageParticipants: body.canManageParticipants || false,
			canViewSensitiveDetails: body.canViewSensitiveDetails || false,
			startDate: body.startDate,
			endDate: body.endDate,
		};

		if (!delegationData.calendarId || !delegationData.delegateId) {
			return NextResponse.json(
				{ success: false, message: "Calendar ID and delegate ID are required" },
				{ status: 400 },
			);
		}

		const delegation = await createCalendarDelegation(delegationData);

		return NextResponse.json({
			success: true,
			delegation,
		});
	} catch (error) {
		console.error("[SERVER] POST /api/calendar/delegations] Error:", error);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to create delegation",
			},
			{ status: 500 },
		);
	}
}

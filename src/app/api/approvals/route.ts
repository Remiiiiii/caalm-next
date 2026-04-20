import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import type { CalendarApprovalStatus } from "@/constants/rbac";
import {
	decideCalendarApprovalRequest,
	listCalendarApprovalRequests,
} from "@/lib/actions/calendar-approval.actions";
import { getUserByAccountId } from "@/lib/actions/user.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	try {
		// Check permission
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.EVENTS.APPROVE,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const accountId = await getCurrentUserId();

		if (!accountId) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const user = await getUserByAccountId(accountId);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const { searchParams } = new URL(request.url);
		const statusParam = searchParams.get("status") as CalendarApprovalStatus;

		const approvals = await listCalendarApprovalRequests({
			status: statusParam || "pending",
		});

		return NextResponse.json({
			data: approvals,
			total: approvals.length,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error fetching approvals:", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json(
			{
				error: "Failed to fetch approvals",
				details: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Check permission
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.EVENTS.APPROVE,
		});

		if (permissionCheck) {
			return permissionCheck;
		}

		const accountId = await getCurrentUserId();

		if (!accountId) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const user = await getUserByAccountId(accountId);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const body = await request.json();
		const { approvalId, action, reviewerNotes } = body;

		if (!approvalId || !action) {
			return NextResponse.json(
				{ error: "Missing required fields: approvalId, action" },
				{ status: 400 },
			);
		}

		if (!["approved", "rejected", "changes_requested"].includes(action)) {
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		const updatedApproval = await decideCalendarApprovalRequest({
			approvalId,
			decision: action,
			approverAccountId: accountId,
			approverUserId: user.$id,
			reviewerNotes,
		});

		return NextResponse.json({
			success: true,
			approval: updatedApproval,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error processing approval:", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json(
			{
				error: "Failed to process approval",
				details: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

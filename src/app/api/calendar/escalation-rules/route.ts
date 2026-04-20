import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserByAccountId } from "@/lib/actions/user.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import {
	type CreateEscalationRuleData,
	createEscalationRule,
	type EscalationRule,
	getActiveEscalationRules,
} from "@/lib/services/calendar-notifications.service";

/**
 * GET /api/calendar/escalation-rules
 * Get all escalation rules for the user's organization
 */
export async function GET(request: NextRequest) {
	try {
		// Check permission - only admins can view escalation rules
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.SETTINGS.VIEW,
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

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json(
				{ success: false, message: "Organization not found" },
				{ status: 404 },
			);
		}

		const { searchParams } = new URL(request.url);
		const triggerEvent = searchParams.get("triggerEvent") as
			| EscalationRule["triggerEvent"]
			| undefined;

		const rules = await getActiveEscalationRules(
			defaultOrg.orgId,
			triggerEvent,
		);

		return NextResponse.json({
			success: true,
			rules,
		});
	} catch (error) {
		console.error("[SERVER] GET /api/calendar/escalation-rules] Error:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch escalation rules",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/calendar/escalation-rules
 * Create a new escalation rule
 */
export async function POST(request: NextRequest) {
	try {
		// Check permission - only admins can create escalation rules
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.SETTINGS.EDIT,
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

		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json(
				{ success: false, message: "Organization not found" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		const ruleData: CreateEscalationRuleData = {
			organizationId: defaultOrg.orgId,
			name: body.name,
			triggerEvent: body.triggerEvent,
			delayMinutes: body.delayMinutes,
			escalationChannels: body.escalationChannels || ["in_app"],
			escalateToUserIds: body.escalateToUserIds || [],
		};

		if (!ruleData.name || !ruleData.triggerEvent) {
			return NextResponse.json(
				{ success: false, message: "Name and trigger event are required" },
				{ status: 400 },
			);
		}

		const rule = await createEscalationRule(ruleData);

		return NextResponse.json({
			success: true,
			rule,
		});
	} catch (error) {
		console.error(
			"[SERVER] POST /api/calendar/escalation-rules] Error:",
			error,
		);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to create escalation rule",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createInvitation, getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.USERS.INVITE,
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { email, name, role, department, division, orgId } = body;

		if (!email || !name || !role || !department || !orgId) {
			return NextResponse.json(
				{
					error:
						"Missing required fields: email, name, role, department, orgId",
				},
				{ status: 400 },
			);
		}

		const hasOrgAccess = await validateUserOrgAccess(currentUser.$id, orgId);
		if (!hasOrgAccess) {
			return NextResponse.json(
				{ error: "Access denied to this organization" },
				{ status: 403 },
			);
		}

		const { getOrganization } = await import("@/lib/rbac/organizations");
		const {
			assertBillingWriteAccess,
			assertWithinLimit,
			getEffectiveLimits,
			BillingLimitError,
		} = await import("@/lib/billing/entitlements");
		const { countOrgMembers } = await import("@/lib/billing/usage");

		const org = await getOrganization(orgId);
		if (!org) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		try {
			assertBillingWriteAccess(org);
			const used = await countOrgMembers(orgId);
			assertWithinLimit({
				resource: "users",
				used,
				limits: getEffectiveLimits(org),
			});
		} catch (limitError) {
			if (limitError instanceof BillingLimitError) {
				return NextResponse.json(
					{ error: limitError.message, code: limitError.code },
					{ status: limitError.status },
				);
			}
			throw limitError;
		}

		const invitation = await createInvitation({
			email,
			name,
			role,
			department,
			division,
			orgId,
			invitedBy: currentUser.$id,
		});

		return NextResponse.json({ data: invitation });
	} catch (error) {
		console.error("Failed to create invitation:", error);
		const { isPlanLimitError } = await import("@/lib/billing/planLimits");
		if (isPlanLimitError(error)) {
			return NextResponse.json(
				{
					error: error.message,
					code: "PLAN_LIMIT_EXCEEDED",
					kind: error.kind,
					limit: error.limit,
					used: error.used,
					tier: error.tier,
				},
				{ status: 402 },
			);
		}

		return NextResponse.json(
			{
				error: "Failed to create invitation",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

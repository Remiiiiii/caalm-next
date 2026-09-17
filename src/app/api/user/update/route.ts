import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser, updateUserProfile } from "@/lib/actions/user.actions";
import { requireStepUpForSession } from "@/lib/auth/step-up";
import {
	normalizeOrgPlacement,
	OrgUnitValidationError,
} from "@/lib/org/org-unit-validation";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import CacheManager from "@/lib/services/cache-manager";
import { logAccountStatusChange } from "@/lib/users/account-status-audit";

export async function PATCH(req: NextRequest) {
	try {
		const permissionCheck = await requirePermission(req, {
			permission: PERMISSIONS.USERS.EDIT,
		});
		if (permissionCheck) return permissionCheck;

		const body = await req.json();
		const {
			accountId,
			fullName,
			role,
			division,
			department,
			status,
			managerUserId,
			costCenterId,
			primaryOrgUnitId,
			departmentId,
			divisionId,
		} = body;
		if (!accountId) {
			return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
		}

		if (status !== undefined) {
			const stepUpCheck = await requireStepUpForSession(req);
			if (stepUpCheck) return stepUpCheck;
		}

		if (
			status !== undefined &&
			!["active", "inactive", "suspended"].includes(status)
		) {
			return NextResponse.json({ error: "Invalid status" }, { status: 400 });
		}

		if (division !== undefined || department !== undefined) {
			try {
				normalizeOrgPlacement({
					department,
					division,
					requireDepartment: department !== undefined || division !== undefined,
				});
			} catch (err) {
				if (err instanceof OrgUnitValidationError) {
					return NextResponse.json({ error: err.message }, { status: 400 });
				}
				throw err;
			}
		}

		const result = await updateUserProfile({
			accountId,
			fullName,
			role,
			division,
			department,
			status,
			managerUserId,
			costCenterId,
			primaryOrgUnitId,
			departmentId,
			divisionId,
		});
		if (!result?.user) {
			return NextResponse.json(
				{ error: "Failed to update user profile" },
				{ status: 500 },
			);
		}
		const { user: updatedUser, previousStatus } = result;

		if (status !== undefined) {
			try {
				const actor = await getCurrentUser();
				if (actor) {
					const target = updatedUser as {
						$id?: string;
						fullName?: string;
						email?: string;
						orgId?: string;
					};
					await logAccountStatusChange({
						actor: {
							$id: actor.$id,
							fullName: actor.fullName,
							email: actor.email,
						},
						target,
						previousStatus,
						nextStatus: status,
						orgId: getOrgIdFromRequest(req) || target.orgId,
						request: req,
					});
					await CacheManager.invalidateAudits();
				}
			} catch (auditError) {
				console.error(
					"[SERVER] PATCH /api/user/update: failed to write status audit",
					auditError,
				);
			}
		}

		return NextResponse.json({ user: updatedUser });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update user profile";
		const status = error instanceof OrgUnitValidationError ? 400 : 500;
		return NextResponse.json({ error: message }, { status });
	}
}

export function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}

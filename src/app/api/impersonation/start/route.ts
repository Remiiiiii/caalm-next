import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser, getUserById } from "@/lib/actions/user.actions";
import { requireStepUpForSession } from "@/lib/auth/step-up";
import { logImpersonationAudit } from "@/lib/impersonation/audit";
import {
	cookieReasonPreview,
	isPrivilegedImpersonationTarget,
	isSameUserIdentity,
	normalizeImpersonationReason,
} from "@/lib/impersonation/policy";
import {
	impersonationTtlMs,
	issueImpersonationCookie,
	readActiveImpersonationClaim,
} from "@/lib/impersonation/session";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import {
	getUserDefaultOrganization,
	getUserPermissions,
	validateUserOrgAccess,
} from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.USERS.IMPERSONATE,
	});
	if (permissionCheck) {
		const actor = await getCurrentUser();
		if (actor) {
			await logImpersonationAudit({
				actor,
				kind: "denied",
				status: "failed",
				errorMessage: "Missing users.impersonate permission",
				request,
			});
		}
		return permissionCheck;
	}

	const stepUpCheck = await requireStepUpForSession(request);
	if (stepUpCheck) return stepUpCheck;

	const actor = await getCurrentUser();
	if (!actor) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	try {
		if (readActiveImpersonationClaim(request)) {
			await logImpersonationAudit({
				actor,
				kind: "denied",
				status: "failed",
				errorMessage: "Already impersonating",
				request,
			});
			return NextResponse.json(
				{
					error:
						"End the current View as user session before starting another.",
				},
				{ status: 409 },
			);
		}

		const body = (await request.json().catch(() => null)) as {
			targetUserId?: unknown;
			reason?: unknown;
			orgId?: unknown;
		} | null;
		const targetUserId =
			typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
		if (!targetUserId) {
			return NextResponse.json(
				{ error: "targetUserId is required" },
				{ status: 400 },
			);
		}

		const reasonResult = normalizeImpersonationReason(body?.reason);
		if (!reasonResult.ok) {
			await logImpersonationAudit({
				actor,
				targetUserId,
				kind: "denied",
				status: "failed",
				errorMessage: reasonResult.error,
				request,
			});
			return NextResponse.json({ error: reasonResult.error }, { status: 400 });
		}

		const requestedOrgId =
			(typeof body?.orgId === "string" && body.orgId.trim()) ||
			getOrgIdFromRequest(request);
		const defaultOrg = await getUserDefaultOrganization(actor.$id);
		const orgId = requestedOrgId || defaultOrg?.orgId;
		if (!orgId) {
			return NextResponse.json(
				{ error: "Organization context is required" },
				{ status: 400 },
			);
		}

		const actorInOrg = await validateUserOrgAccess(actor.$id, orgId);
		if (!actorInOrg) {
			await logImpersonationAudit({
				actor,
				targetUserId,
				orgId,
				reason: reasonResult.reason,
				kind: "denied",
				status: "failed",
				errorMessage: "Actor is not a member of this organization",
				request,
			});
			return NextResponse.json(
				{ error: "You can only view as a user in your organization." },
				{ status: 403 },
			);
		}

		const target = await getUserById(targetUserId);
		if (!target) {
			await logImpersonationAudit({
				actor,
				targetUserId,
				orgId,
				reason: reasonResult.reason,
				kind: "denied",
				status: "failed",
				errorMessage: "Target user not found",
				request,
			});
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const targetProfile = {
			$id: String(target.$id),
			accountId: String((target as { accountId?: string }).accountId || ""),
			fullName: String((target as { fullName?: string }).fullName || ""),
			email: String((target as { email?: string }).email || ""),
		};

		if (isSameUserIdentity(actor, targetProfile)) {
			await logImpersonationAudit({
				actor,
				targetUserId: targetProfile.$id,
				targetLabel: targetProfile.fullName,
				orgId,
				reason: reasonResult.reason,
				kind: "denied",
				status: "failed",
				errorMessage: "Cannot impersonate self",
				request,
			});
			return NextResponse.json(
				{ error: "You cannot view as yourself." },
				{ status: 400 },
			);
		}

		const targetInOrg = await validateUserOrgAccess(targetProfile.$id, orgId);
		if (!targetInOrg) {
			await logImpersonationAudit({
				actor,
				targetUserId: targetProfile.$id,
				targetLabel: targetProfile.fullName,
				orgId,
				reason: reasonResult.reason,
				kind: "denied",
				status: "failed",
				errorMessage: "Cross-tenant impersonation blocked",
				request,
			});
			return NextResponse.json(
				{ error: "That user is not in this organization." },
				{ status: 403 },
			);
		}

		const targetPermissions = await getUserPermissions(
			targetProfile.$id,
			orgId,
		);
		if (isPrivilegedImpersonationTarget(targetPermissions)) {
			await logImpersonationAudit({
				actor,
				targetUserId: targetProfile.$id,
				targetLabel: targetProfile.fullName,
				orgId,
				reason: reasonResult.reason,
				kind: "denied",
				status: "failed",
				errorMessage: "Privileged target",
				request,
			});
			return NextResponse.json(
				{
					error:
						"You cannot view as a user who can impersonate others or who holds platform break-glass access.",
				},
				{ status: 403 },
			);
		}

		const now = Date.now();
		const expiresAt = now + impersonationTtlMs();
		const response = NextResponse.json({
			active: true,
			actorUserId: actor.$id,
			target: {
				$id: targetProfile.$id,
				fullName: targetProfile.fullName,
				email: targetProfile.email,
			},
			orgId,
			reason: reasonResult.reason,
			startedAt: new Date(now).toISOString(),
			expiresAt: new Date(expiresAt).toISOString(),
			readOnly: true,
		});

		issueImpersonationCookie(response, {
			actorUserId: actor.$id,
			targetUserId: targetProfile.$id,
			orgId,
			reason: cookieReasonPreview(reasonResult.reason),
			startedAt: now,
			expiresAt,
		});

		await logImpersonationAudit({
			actor,
			targetUserId: targetProfile.$id,
			targetLabel: targetProfile.fullName || targetProfile.email,
			orgId,
			reason: reasonResult.reason,
			kind: "start",
			status: "success",
			request,
		});

		return response;
	} catch (error) {
		console.error("[SERVER] POST /api/impersonation/start:", error);
		return NextResponse.json(
			{ error: "Failed to start impersonation" },
			{ status: 500 },
		);
	}
}

export function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}

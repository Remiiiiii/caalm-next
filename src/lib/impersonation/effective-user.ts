import type { NextRequest } from "next/server";
import { getCurrentUser, getUserById } from "@/lib/actions/user.actions";
import {
	IMPERSONATION_COOKIE,
	isImpersonationClaimActive,
	parseImpersonationClaim,
} from "@/lib/impersonation/session";

export type ImpersonationProfile = {
	$id: string;
	accountId?: string;
	fullName?: string;
	email?: string;
	avatar?: string;
	role?: string;
	division?: string;
	department?: string;
	departmentLabel?: string;
};

export type EffectiveUserContext = {
	actor: ImpersonationProfile;
	effectiveUser: ImpersonationProfile;
	impersonation: {
		actorUserId: string;
		targetUserId: string;
		orgId: string;
		reason: string;
		startedAt: string;
		expiresAt: string;
		target: {
			$id: string;
			fullName: string;
			email: string;
			department?: string;
			departmentLabel?: string;
		};
	} | null;
};

function asProfile(user: {
	$id: string;
	accountId?: string;
	fullName?: string;
	name?: string;
	email?: string;
	avatar?: string;
	role?: string;
	division?: string;
	department?: string;
	departmentLabel?: string;
}): ImpersonationProfile {
	return {
		$id: user.$id,
		accountId: user.accountId,
		fullName: user.fullName || user.name,
		email: user.email,
		avatar: user.avatar,
		role: user.role,
		division: user.division,
		department: user.department,
		departmentLabel: user.departmentLabel,
	};
}

/**
 * Actor is the signed-in admin. While an impersonation cookie is active,
 * effectiveUser is the target (product UI/API should authorize as the target).
 */
export async function getEffectiveUserFromToken(
	token: string | undefined,
): Promise<EffectiveUserContext | null> {
	const actorRaw = await getCurrentUser();
	if (!actorRaw) return null;

	const actor = asProfile(actorRaw);
	const claim = parseImpersonationClaim(token);
	if (!isImpersonationClaimActive(claim) || claim.actorUserId !== actor.$id) {
		return { actor, effectiveUser: actor, impersonation: null };
	}

	const targetRow = await getUserById(claim.targetUserId);
	if (!targetRow) {
		return { actor, effectiveUser: actor, impersonation: null };
	}

	const target = asProfile({
		$id: String(targetRow.$id),
		accountId: String((targetRow as { accountId?: string }).accountId || ""),
		fullName: String((targetRow as { fullName?: string }).fullName || ""),
		email: String((targetRow as { email?: string }).email || ""),
		avatar: String((targetRow as { avatar?: string }).avatar || ""),
		role: String((targetRow as { role?: string }).role || ""),
		division: String((targetRow as { division?: string }).division || ""),
		department: String((targetRow as { department?: string }).department || ""),
		departmentLabel: String(
			(targetRow as { departmentLabel?: string }).departmentLabel || "",
		),
	});

	return {
		actor,
		effectiveUser: target,
		impersonation: {
			actorUserId: claim.actorUserId,
			targetUserId: claim.targetUserId,
			orgId: claim.orgId,
			reason: claim.reason,
			startedAt: new Date(claim.startedAt).toISOString(),
			expiresAt: new Date(claim.expiresAt).toISOString(),
			target: {
				$id: target.$id,
				fullName: target.fullName || target.email || "User",
				email: target.email || "",
				department: target.department,
				departmentLabel: target.departmentLabel,
			},
		},
	};
}

export async function getEffectiveUser(
	request: NextRequest,
): Promise<EffectiveUserContext | null> {
	return getEffectiveUserFromToken(
		request.cookies.get(IMPERSONATION_COOKIE)?.value,
	);
}

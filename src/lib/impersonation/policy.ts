import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";

export const MIN_IMPERSONATION_REASON_LENGTH = 8;
export const MAX_IMPERSONATION_REASON_LENGTH = 500;
export const MIN_IMPERSONATION_TTL_MINUTES = 15;
export const MAX_IMPERSONATION_TTL_MINUTES = 60;
export const DEFAULT_IMPERSONATION_TTL_MINUTES = 30;

/**
 * Targets holding these keys cannot be impersonated (no nested / peer-admin View as).
 * Checked from database permissions — never from a role display name.
 */
export const PRIVILEGED_IMPERSONATION_TARGET_PERMISSIONS: readonly PermissionKey[] =
	[
		PERMISSIONS.USERS.IMPERSONATE,
		PERMISSIONS.PLATFORM.ELEVATE,
		PERMISSIONS.PLATFORM.VIEW_ALL_ORGS,
		PERMISSIONS.PLATFORM.SYSTEM_SETTINGS,
		PERMISSIONS.PLATFORM.DIAGNOSE,
		PERMISSIONS.PLATFORM.MANAGE_SCHEMA,
		PERMISSIONS.PLATFORM.FORCE_DELETE,
	];

export function clampImpersonationTtlMinutes(value: number): number {
	if (!Number.isFinite(value) || value <= 0) {
		return DEFAULT_IMPERSONATION_TTL_MINUTES;
	}
	return Math.min(
		MAX_IMPERSONATION_TTL_MINUTES,
		Math.max(MIN_IMPERSONATION_TTL_MINUTES, Math.round(value)),
	);
}

export function normalizeImpersonationReason(
	raw: unknown,
): { ok: true; reason: string } | { ok: false; error: string } {
	if (typeof raw !== "string") {
		return { ok: false, error: "A reason is required (ticket ID or note)." };
	}
	const reason = raw.trim().replace(/\s+/g, " ");
	if (reason.length < MIN_IMPERSONATION_REASON_LENGTH) {
		return {
			ok: false,
			error: `Reason must be at least ${MIN_IMPERSONATION_REASON_LENGTH} characters.`,
		};
	}
	if (reason.length > MAX_IMPERSONATION_REASON_LENGTH) {
		return {
			ok: false,
			error: `Reason must be ${MAX_IMPERSONATION_REASON_LENGTH} characters or fewer.`,
		};
	}
	return { ok: true, reason };
}

export function isSameUserIdentity(
	actor: { $id?: string; accountId?: string },
	target: { $id?: string; accountId?: string },
): boolean {
	const actorIds = [actor.$id, actor.accountId].filter(Boolean);
	const targetIds = [target.$id, target.accountId].filter(Boolean);
	return actorIds.some((id) => targetIds.includes(id));
}

export function isPrivilegedImpersonationTarget(
	heldPermissions: Iterable<string>,
): boolean {
	const held =
		heldPermissions instanceof Set ? heldPermissions : new Set(heldPermissions);
	return PRIVILEGED_IMPERSONATION_TARGET_PERMISSIONS.some((key) =>
		held.has(key),
	);
}

export function cookieReasonPreview(reason: string): string {
	return reason.length > 120 ? `${reason.slice(0, 117)}...` : reason;
}

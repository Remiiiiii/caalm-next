/**
 * Server-side auth attempt lockout with exponential backoff.
 * Uses Redis when available; falls back to the shared in-memory cache.
 */

import * as cache from "@/lib/services/redis-cache";

export const AUTH_LOCKOUT = {
	maxFailures: 3,
	baseLockSeconds: 15 * 60, // 15 minutes
	maxLockSeconds: 24 * 60 * 60, // 24 hours
} as const;

export type AuthLockoutKind = "email-otp" | "2fa";

export type AuthLockoutState = {
	failures: number;
	lockouts: number;
	lockedUntil: number | null;
};

export type AuthLockoutCheck = {
	locked: boolean;
	retryAfterSeconds: number;
	failures: number;
	lockouts: number;
};

const EMPTY_STATE: AuthLockoutState = {
	failures: 0,
	lockouts: 0,
	lockedUntil: null,
};

function lockoutKey(kind: AuthLockoutKind, subject: string): string {
	return `auth:lockout:${kind}:${subject.toLowerCase().trim()}`;
}

function computeLockSeconds(lockouts: number): number {
	const multiplier = 2 ** Math.max(0, lockouts - 1);
	return Math.min(
		AUTH_LOCKOUT.baseLockSeconds * multiplier,
		AUTH_LOCKOUT.maxLockSeconds,
	);
}

async function readState(
	kind: AuthLockoutKind,
	subject: string,
): Promise<AuthLockoutState> {
	const stored = await cache.get<AuthLockoutState>(lockoutKey(kind, subject));
	if (!stored) return { ...EMPTY_STATE };
	return {
		failures: stored.failures ?? 0,
		lockouts: stored.lockouts ?? 0,
		lockedUntil: stored.lockedUntil ?? null,
	};
}

async function writeState(
	kind: AuthLockoutKind,
	subject: string,
	state: AuthLockoutState,
	ttlSeconds: number,
): Promise<void> {
	await cache.set(lockoutKey(kind, subject), state, Math.max(ttlSeconds, 60));
}

export async function getAuthLockoutStatus(
	kind: AuthLockoutKind,
	subject: string,
): Promise<AuthLockoutCheck> {
	if (!subject) {
		return { locked: false, retryAfterSeconds: 0, failures: 0, lockouts: 0 };
	}

	const state = await readState(kind, subject);
	const now = Date.now();

	if (state.lockedUntil && state.lockedUntil > now) {
		return {
			locked: true,
			retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
			failures: state.failures,
			lockouts: state.lockouts,
		};
	}

	if (state.lockedUntil && state.lockedUntil <= now) {
		// Lock expired; keep lockouts count for exponential growth on next lock
		await writeState(
			kind,
			subject,
			{ failures: 0, lockouts: state.lockouts, lockedUntil: null },
			AUTH_LOCKOUT.maxLockSeconds,
		);
		return {
			locked: false,
			retryAfterSeconds: 0,
			failures: 0,
			lockouts: state.lockouts,
		};
	}

	return {
		locked: false,
		retryAfterSeconds: 0,
		failures: state.failures,
		lockouts: state.lockouts,
	};
}

export type RecordAuthFailureResult = AuthLockoutCheck & {
	justLocked: boolean;
};

/**
 * Record a failed auth attempt. Returns whether a new lockout was triggered.
 */
export async function recordAuthFailure(
	kind: AuthLockoutKind,
	subject: string,
): Promise<RecordAuthFailureResult> {
	if (!subject) {
		return {
			locked: false,
			retryAfterSeconds: 0,
			failures: 0,
			lockouts: 0,
			justLocked: false,
		};
	}

	const current = await getAuthLockoutStatus(kind, subject);
	if (current.locked) {
		return { ...current, justLocked: false };
	}

	const state = await readState(kind, subject);
	const failures = (state.failures || 0) + 1;

	if (failures >= AUTH_LOCKOUT.maxFailures) {
		const lockouts = (state.lockouts || 0) + 1;
		const lockSeconds = computeLockSeconds(lockouts);
		const lockedUntil = Date.now() + lockSeconds * 1000;
		await writeState(
			kind,
			subject,
			{ failures: 0, lockouts, lockedUntil },
			Math.max(lockSeconds, AUTH_LOCKOUT.maxLockSeconds),
		);
		return {
			locked: true,
			retryAfterSeconds: lockSeconds,
			failures: 0,
			lockouts,
			justLocked: true,
		};
	}

	await writeState(
		kind,
		subject,
		{
			failures,
			lockouts: state.lockouts || 0,
			lockedUntil: null,
		},
		AUTH_LOCKOUT.baseLockSeconds,
	);

	return {
		locked: false,
		retryAfterSeconds: 0,
		failures,
		lockouts: state.lockouts || 0,
		justLocked: false,
	};
}

/** Clear failure streak after a successful verify (keeps historical lockouts). */
export async function clearAuthFailures(
	kind: AuthLockoutKind,
	subject: string,
): Promise<void> {
	if (!subject) return;
	const state = await readState(kind, subject);
	await writeState(
		kind,
		subject,
		{
			failures: 0,
			lockouts: state.lockouts || 0,
			lockedUntil: null,
		},
		AUTH_LOCKOUT.maxLockSeconds,
	);
}

export const LOCKOUT_USER_MESSAGE = "Too many attempts. Sign in again.";

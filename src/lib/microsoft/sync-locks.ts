/**
 * In-process locks for Outlook calendar sync. Shared by the sync route, the
 * auto-sync route, and server-side callers — checked directly in-process
 * instead of over an HTTP self-call (which previously hit a hardcoded
 * http://localhost:3000 URL and broke outside that exact dev setup).
 */

type ProcessSyncLockState = { isLocked: boolean; timestamp: number };

let processLock: ProcessSyncLockState = { isLocked: false, timestamp: 0 };

const SYNC_LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const SYNC_COOLDOWN = 2 * 60 * 1000; // 2 minutes between syncs

export type ProcessLockCheck =
	| { blocked: false }
	| {
			blocked: true;
			status: number;
			body: {
				success: false;
				message: string;
				lockedUntil?: string;
				cooldownRemaining?: number;
			};
	  };

export function checkProcessSyncLock(now = Date.now()): ProcessLockCheck {
	if (processLock.isLocked && now - processLock.timestamp < SYNC_LOCK_TIMEOUT) {
		return {
			blocked: true,
			status: 429,
			body: {
				success: false,
				message: "Sync already in progress. Please wait.",
				lockedUntil: new Date(
					processLock.timestamp + SYNC_LOCK_TIMEOUT,
				).toISOString(),
			},
		};
	}
	if (
		processLock.timestamp > 0 &&
		now - processLock.timestamp < SYNC_COOLDOWN
	) {
		return {
			blocked: true,
			status: 429,
			body: {
				success: false,
				message: "Please wait before syncing again.",
				cooldownRemaining: Math.ceil(
					(SYNC_COOLDOWN - (now - processLock.timestamp)) / 1000,
				),
			},
		};
	}
	return { blocked: false };
}

export function acquireProcessSyncLock(now = Date.now()): void {
	processLock = { isLocked: true, timestamp: now };
}

export function releaseProcessSyncLock(): void {
	processLock = { isLocked: false, timestamp: 0 };
}

// --- Global, admin-controlled lock (shared with /api/microsoft/global-sync-lock) ---

type GlobalSyncLockState = {
	isLocked: boolean;
	lockedAt: number;
	lockedBy: string;
	message: string;
};

let globalLock: GlobalSyncLockState = {
	isLocked: false,
	lockedAt: 0,
	lockedBy: "",
	message: "",
};

const GLOBAL_LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes for stale locks

export function getGlobalSyncLockStatus(now = Date.now()): GlobalSyncLockState {
	if (globalLock.isLocked && now - globalLock.lockedAt > GLOBAL_LOCK_TIMEOUT) {
		globalLock = { isLocked: false, lockedAt: 0, lockedBy: "", message: "" };
	}
	return { ...globalLock };
}

export function setGlobalSyncLock(lockedBy: string, message: string): void {
	globalLock = {
		isLocked: true,
		lockedAt: Date.now(),
		lockedBy: lockedBy || "system",
		message: message || "Global sync lock is active",
	};
}

export function clearGlobalSyncLock(): void {
	globalLock = { isLocked: false, lockedAt: 0, lockedBy: "", message: "" };
}

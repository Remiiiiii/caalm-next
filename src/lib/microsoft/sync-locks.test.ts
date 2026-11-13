import { beforeEach, describe, expect, it } from "vitest";
import {
	acquireProcessSyncLock,
	checkProcessSyncLock,
	clearGlobalSyncLock,
	getGlobalSyncLockStatus,
	releaseProcessSyncLock,
	setGlobalSyncLock,
} from "./sync-locks";

describe("sync-locks", () => {
	beforeEach(() => {
		releaseProcessSyncLock();
		clearGlobalSyncLock();
	});

	describe("process sync lock", () => {
		it("is unblocked with no prior sync", () => {
			expect(checkProcessSyncLock()).toEqual({ blocked: false });
		});

		it("blocks while a sync is in progress", () => {
			const now = Date.now();
			acquireProcessSyncLock(now);
			const check = checkProcessSyncLock(now + 1000);
			expect(check.blocked).toBe(true);
			if (check.blocked) {
				expect(check.status).toBe(429);
				expect(check.body.message).toMatch(/already in progress/i);
			}
		});

		it("unblocks once a completed sync releases the lock", () => {
			const now = Date.now();
			acquireProcessSyncLock(now);
			releaseProcessSyncLock();
			expect(checkProcessSyncLock(now + 1000)).toEqual({ blocked: false });
		});

		it("unblocks once the lock timeout passes even without release", () => {
			const now = Date.now();
			acquireProcessSyncLock(now);
			expect(checkProcessSyncLock(now + 11 * 60 * 1000)).toEqual({
				blocked: false,
			});
		});
	});

	describe("global sync lock", () => {
		it("is unlocked by default", () => {
			expect(getGlobalSyncLockStatus().isLocked).toBe(false);
		});

		it("reports locked after setGlobalSyncLock", () => {
			setGlobalSyncLock("admin-1", "Maintenance window");
			const status = getGlobalSyncLockStatus();
			expect(status.isLocked).toBe(true);
			expect(status.lockedBy).toBe("admin-1");
			expect(status.message).toBe("Maintenance window");
		});

		it("clears via clearGlobalSyncLock", () => {
			setGlobalSyncLock("admin-1", "Maintenance window");
			clearGlobalSyncLock();
			expect(getGlobalSyncLockStatus().isLocked).toBe(false);
		});

		it("auto-expires a stale lock after the timeout", () => {
			setGlobalSyncLock("admin-1", "Maintenance window");
			const future = Date.now() + 31 * 60 * 1000;
			expect(getGlobalSyncLockStatus(future).isLocked).toBe(false);
		});
	});
});

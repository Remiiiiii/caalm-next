import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();

vi.mock("node-appwrite", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node-appwrite")>();
	return {
		...actual,
		Client: class {
			setEndpoint() {
				return this;
			}
			setProject() {
				return this;
			}
			setKey() {
				return this;
			}
		},
		Users: class {
			list = listMock;
		},
	};
});

import {
	AUTH_JOIN_TIMEOUT_MS,
	listAuthPasswordUpdatesByAccountId,
} from "@/lib/users/auth-password-updates";

describe("listAuthPasswordUpdatesByAccountId", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		listMock.mockReset();
		process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = "https://example.appwrite.io/v1";
		process.env.NEXT_PUBLIC_APPWRITE_PROJECT = "proj";
		process.env.NEXT_APPWRITE_API_KEY = "key";
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns ok:false when Auth list hangs past the join timeout", async () => {
		listMock.mockReturnValue(new Promise(() => {}));
		const pending = listAuthPasswordUpdatesByAccountId();
		await vi.advanceTimersByTimeAsync(AUTH_JOIN_TIMEOUT_MS);
		const result = await pending;
		expect(result.ok).toBe(false);
		expect(result.byAccount.size).toBe(0);
	});

	it("returns passwordUpdate stamps when Auth list succeeds", async () => {
		const lastChangedAt = "2026-01-01T00:00:00.000Z";
		listMock.mockResolvedValue({
			users: [{ $id: "acc-1", passwordUpdate: lastChangedAt }],
		});
		const result = await listAuthPasswordUpdatesByAccountId();
		expect(result.ok).toBe(true);
		expect(result.byAccount.get("acc-1")).toBe(lastChangedAt);
	});
});

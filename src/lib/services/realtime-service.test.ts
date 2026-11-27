import { beforeEach, describe, expect, it, vi } from "vitest";

const { subscribeMock, setSessionMock } = vi.hoisted(() => ({
	subscribeMock: vi.fn((_channel: string, _onEvent: (event: unknown) => void) =>
		vi.fn(),
	),
	setSessionMock: vi.fn(),
}));

vi.mock("@/lib/appwrite/client", () => ({
	client: { subscribe: subscribeMock, setSession: setSessionMock },
}));

vi.mock("@/lib/appwrite/config", () => ({
	appwriteConfig: { databaseId: "db1" },
}));

vi.mock("@/lib/actions/auth.actions", () => ({
	getRealtimeSessionSecret: vi.fn(async () => "fake-session-secret"),
}));

import {
	subscribeToCollection,
	unsubscribeFromCollection,
} from "./realtime-service";

describe("subscribeToCollection", () => {
	beforeEach(() => {
		subscribeMock.mockClear();
		unsubscribeFromCollection("col1");
	});

	it("routes events to the latest caller's onUpdate when a channel is already open", async () => {
		const first = vi.fn();
		const second = vi.fn();

		subscribeToCollection("col1", { onUpdate: first });
		// Second subscribe for the same collection reuses the open socket —
		// the live listener must switch to this caller's callback, not keep `first`.
		subscribeToCollection("col1", { onUpdate: second });

		// The actual socket subscribe is deferred behind the session-auth promise.
		await Promise.resolve();
		await Promise.resolve();

		expect(subscribeMock).toHaveBeenCalledTimes(1);
		const emit = subscribeMock.mock.calls[0][1];
		emit({ payload: { ok: true } });

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith({ ok: true });
	});

	it("authenticates the client with a session secret before subscribing", async () => {
		subscribeToCollection("col1", { onUpdate: vi.fn() });

		await Promise.resolve();
		await Promise.resolve();

		expect(setSessionMock).toHaveBeenCalledWith("fake-session-secret");
	});
});

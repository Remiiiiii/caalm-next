import { describe, expect, it } from "vitest";
import { isSelfUserId } from "@/lib/auth/is-self-user-id";

const user = { $id: "row_123", accountId: "acct_456" };

describe("isSelfUserId", () => {
	it("accepts the users-table id and the Auth account id", () => {
		expect(isSelfUserId("row_123", user)).toBe(true);
		expect(isSelfUserId("acct_456", user)).toBe(true);
	});

	it("rejects other users and empty ids", () => {
		expect(isSelfUserId("someone_else", user)).toBe(false);
		expect(isSelfUserId("", user)).toBe(false);
		expect(isSelfUserId(undefined, user)).toBe(false);
		expect(isSelfUserId("", { $id: "row_123", accountId: "" })).toBe(false);
	});
});

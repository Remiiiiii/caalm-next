import { describe, expect, it } from "vitest";
import { assertCanLeaveNegotiation } from "@/lib/contracts/negotiation/lifecycle.logic";

describe("roadmap task 7.5 wire lifecycleStatus negotiation", () => {
	it("blocks send-for-review while comments are open unless the user can approve", () => {
		const blocked = assertCanLeaveNegotiation({
			lifecycleStatus: "negotiation",
			openCommentCount: 2,
			hasApprovePermission: false,
		});
		expect(blocked.ok).toBe(false);

		const resolved = assertCanLeaveNegotiation({
			lifecycleStatus: "negotiation",
			openCommentCount: 0,
			hasApprovePermission: false,
		});
		expect(resolved.ok).toBe(true);

		const override = assertCanLeaveNegotiation({
			lifecycleStatus: "negotiation",
			openCommentCount: 2,
			hasApprovePermission: true,
		});
		expect(override.ok).toBe(true);
	});
});

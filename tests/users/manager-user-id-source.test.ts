import { describe, expect, it } from "vitest";
import {
	parseManagerUserIdSource,
	shouldSyncManagerUserIdOnReassign,
} from "@/lib/users/manager-user-id-source";

describe("managerUserId source", () => {
	it("parses manual and scim only", () => {
		expect(parseManagerUserIdSource("manual")).toBe("manual");
		expect(parseManagerUserIdSource("scim")).toBe("scim");
		expect(parseManagerUserIdSource(undefined)).toBeNull();
		expect(parseManagerUserIdSource("other")).toBeNull();
	});

	it("syncs managerUserId only for manual", () => {
		expect(shouldSyncManagerUserIdOnReassign("manual")).toBe(true);
		expect(shouldSyncManagerUserIdOnReassign("scim")).toBe(false);
		expect(shouldSyncManagerUserIdOnReassign(undefined)).toBe(false);
	});
});

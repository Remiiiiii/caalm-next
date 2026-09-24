import { describe, expect, it } from "vitest";
import {
	buildActivityAuditEntry,
	mapActivityTypeToAudit,
} from "./mirror-activity";

describe("mapActivityTypeToAudit", () => {
	it("maps feed types to audit modules and actions", () => {
		expect(mapActivityTypeToAudit("file")).toEqual({
			module: "documents",
			action: "create",
			targetType: "file",
		});
		expect(mapActivityTypeToAudit("contract")).toEqual({
			module: "contracts",
			action: "update",
			targetType: "contract",
		});
		expect(mapActivityTypeToAudit("event")).toEqual({
			module: "governance",
			action: "create",
			targetType: "event",
		});
		expect(mapActivityTypeToAudit("user")).toEqual({
			module: "governance",
			action: "create",
			targetType: "user",
		});
		expect(mapActivityTypeToAudit("notification")).toEqual({
			module: "system",
			action: "update",
			targetType: "notification",
		});
	});
});

describe("buildActivityAuditEntry", () => {
	it("uses a stable event_id and correlation_id", () => {
		const entry = buildActivityAuditEntry({
			$id: "act123",
			action: "File Uploaded",
			description: "grant.pdf",
			type: "file",
			userId: "user1",
			userName: "Ada",
			orgId: "org1",
		});

		expect(entry.event_id).toBe("activity-act123");
		expect(entry.correlation_id).toBe("recent-activity:act123");
		expect(entry.module).toBe("documents");
		expect(entry.target_label).toBe("grant.pdf");
	});
});

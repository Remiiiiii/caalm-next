import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

describe("News Article Permissions", () => {
	it("defines create/read/update/delete/publish keys", () => {
		expect(PERMISSIONS.NEWS.CREATE).toBe("news.create");
		expect(PERMISSIONS.NEWS.READ).toBe("news.read");
		expect(PERMISSIONS.NEWS.UPDATE).toBe("news.update");
		expect(PERMISSIONS.NEWS.DELETE).toBe("news.delete");
		expect(PERMISSIONS.NEWS.PUBLISH).toBe("news.publish");
	});

	it("defines approve, feeds, and acknowledgment admin keys", () => {
		expect(PERMISSIONS.NEWS.APPROVE).toBe("news.approve");
		expect(PERMISSIONS.NEWS.FEEDS_MANAGE).toBe("news.feeds.manage");
		expect(PERMISSIONS.NEWS.ACK_MANAGE).toBe("news.ack.manage");
	});

	it("does not use role-name shortcuts for news access", () => {
		const keys = Object.values(PERMISSIONS.NEWS);
		expect(keys.every((key) => key.startsWith("news."))).toBe(true);
	});
});

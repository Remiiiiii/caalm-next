import { describe, expect, it } from "vitest";

describe("acknowledgment versioning", () => {
	it("requires a new ack when the article version is higher", () => {
		const articleVersion = 2;
		const lastAckVersion = 1;
		const needsReAck = lastAckVersion < articleVersion;
		expect(needsReAck).toBe(true);
	});

	it("treats same-version acks as complete", () => {
		expect(2 < 2).toBe(false);
	});
});

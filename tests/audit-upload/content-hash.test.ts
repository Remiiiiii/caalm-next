import { describe, expect, it } from "vitest";
import { hashAuditContent } from "@/lib/audit-upload/content-hash";

describe("hashAuditContent", () => {
	it("returns a stable sha-256 hex digest", () => {
		const first = hashAuditContent(Buffer.from("same-bytes"));
		const second = hashAuditContent(Buffer.from("same-bytes"));
		expect(first).toBe(second);
		expect(first).toMatch(/^[a-f0-9]{64}$/);
	});

	it("changes when the file bytes change", () => {
		expect(hashAuditContent(Buffer.from("a"))).not.toBe(
			hashAuditContent(Buffer.from("b")),
		);
	});
});

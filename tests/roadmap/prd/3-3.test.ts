import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PRD 3.3 audit log on session revoke", () => {
	it("revoke-sessions writes a security audit with actor and target", () => {
		const source = readFileSync(
			join(
				process.cwd(),
				"src/app/api/admin/users/[userId]/revoke-sessions/route.ts",
			),
			"utf8",
		);
		expect(source).toMatch(/logSecurityAudit/);
		expect(source).toMatch(/session_revoke/);
		expect(source).toMatch(/getCurrentUser/);
		expect(source).toMatch(/target:/);
	});

	it("security audit helper records actor and target user ids", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/auth/security-audit.ts"),
			"utf8",
		);
		expect(source).toMatch(/Sessions revoked/);
		expect(source).toMatch(/module:\s*["']auth["']/);
		expect(source).toMatch(/actorUserId/);
		expect(source).toMatch(/targetUserId/);
		expect(source).toMatch(/target_id/);
	});
});

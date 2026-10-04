import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";
import { linkedPrNumbersForPrdSection } from "@/lib/roadmap/platform-readiness/prd-pr-batches";

describe("PRD 3.4 audit log on password and 2FA reset", () => {
	it("admin password reset emails write an audit event", () => {
		const source = readFileSync(
			join(
				process.cwd(),
				"src/app/api/admin/users/[userId]/reset-password/route.ts",
			),
			"utf8",
		);
		expect(source).toMatch(/logSecurityAudit/);
		expect(source).toMatch(/password_reset/);
	});

	it("2FA disable/reset writes an audit event", () => {
		const disable = readFileSync(
			join(process.cwd(), "src/app/api/2fa/disable/route.ts"),
			"utf8",
		);
		expect(disable).toMatch(/logSecurityAudit/);
		expect(disable).toMatch(/two_factor_reset/);
		expect(disable).toMatch(/requireSessionUser/);

		const setup = readFileSync(
			join(process.cwd(), "src/app/api/2fa/setup/route.ts"),
			"utf8",
		);
		expect(setup).toMatch(/two_factor_reset/);
	});

	it("security audit titles cover password and 2FA reset for filters", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/auth/security-audit.ts"),
			"utf8",
		);
		expect(source).toMatch(/Password reset emailed/);
		expect(source).toMatch(/Two-factor authentication reset/);
	});

	it("documents the section and links PR 185", () => {
		const note = readFileSync(
			join(process.cwd(), "docs/internal/sign-in-trust-note.md"),
			"utf8",
		);
		expect(note).toMatch(/Sessions revoked/);
		expect(note).toMatch(/Password reset emailed/);

		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 3,
		);
		expect(section?.sourceRef).toMatch(
			/docs\/internal\/sign-in-trust-note\.md/,
		);
		expect(section?.linkedPrNumbers).toEqual(
			linkedPrNumbersForPrdSection(3),
		);
		expect(section?.linkedPrNumbers).toContain(185);
	});
});

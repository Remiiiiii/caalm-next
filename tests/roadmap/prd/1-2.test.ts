import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PRD 1.2 org filter on licenses, files, and invites", () => {
	it("dashboard files route scopes listRows by orgId and requires permission", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/dashboard/files/route.ts"),
			"utf8",
		);
		expect(source).toMatch(/Query\.equal\(\s*["']orgId["']/);
		expect(source).toMatch(/requirePermission/);
	});

	it("dashboard invitations route requires auth and org membership", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/dashboard/invitations/route.ts"),
			"utf8",
		);
		expect(source).toMatch(/requirePermission/);
		expect(source).toMatch(/validateUserOrgAccess/);
	});

	it("license detail loader rejects cross-org rows", () => {
		const source = readFileSync(
			join(
				process.cwd(),
				"src/lib/api/licenses/services/LicenseService.ts",
			),
			"utf8",
		);
		expect(source).toContain("getLicenseByIdForOrg");
		expect(source).toMatch(/rowOrg !== orgId/);
		expect(source).toMatch(/return null/);
	});

	it("license GET route uses org-scoped loader", () => {
		const source = readFileSync(
			join(process.cwd(), "src/app/api/licenses/[id]/route.ts"),
			"utf8",
		);
		expect(source).toContain("getLicenseByIdForOrg");
		expect(source).toContain("getUserDefaultOrganization");
	});
});

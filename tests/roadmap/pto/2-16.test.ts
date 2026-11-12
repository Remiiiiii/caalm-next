import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PTO 2.16 upload_contract_file tool", () => {
	const source = readFileSync(
		join(process.cwd(), "src/lib/assistant/tools/contractTools.ts"),
		"utf8",
	);

	it("registers upload_contract_file gated by contracts.edit and is mutating", () => {
		expect(source).toMatch(/name:\s*"upload_contract_file"/);
		expect(source).toMatch(
			/name:\s*"upload_contract_file"[\s\S]{0,300}PERMISSIONS\.CONTRACTS\.EDIT/,
		);
		expect(source).toMatch(
			/name:\s*"upload_contract_file"[\s\S]{0,400}mutating:\s*true/,
		);
	});

	it("rejects non-HTTPS urls, stores via storage.createFile, links fileId, and audits", () => {
		expect(source).toContain('fileUrl.startsWith("https://")');
		expect(source).toContain("storage.createFile(");
		expect(source).toMatch(
			/name:\s*"upload_contract_file"[\s\S]{0,6000}logAuditEvent/,
		);
	});
});

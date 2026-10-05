import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROADMAP_CATALOG } from "@/lib/roadmap/catalog";

describe("PRD 6.3 handoff to CLM API and SSO", () => {
	it("CLM section 11 cites Platform Readiness prerequisites", () => {
		const section = ROADMAP_CATALOG.find((s) => s.sectionNumber === 11);
		expect(section?.sourceRef).toMatch(/PRD §1–5/);
		expect(section?.sourceRef).toMatch(/platform-readiness-vs-clm\.md/);
		const apiTask = section?.tasks.find((t) => t.taskCode === "11.1");
		expect(apiTask?.description).toMatch(/PRD §1–5/);
	});

	it("CLM section 12 cites SSO handoff and real IdP state", () => {
		const section = ROADMAP_CATALOG.find((s) => s.sectionNumber === 12);
		expect(section?.sourceRef).toMatch(/PRD §1–5/);
		const saml = section?.tasks.find((t) => t.taskCode === "12.1");
		expect(saml?.description).toMatch(/Coming soon/);
	});

	it("handoff doc lists the engineering checklist", () => {
		const doc = readFileSync(
			join(process.cwd(), "docs/internal/platform-readiness-vs-clm.md"),
			"utf8",
		);
		expect(doc).toMatch(/PRD 6\.3 handoff checklist/);
		expect(doc).toMatch(/§11/);
		expect(doc).toMatch(/§12/);
	});
});

import { describe, expect, it } from "vitest";
import {
	findDuplicateCatalogPrNumbers,
	getCatalogLinkedPrNumber,
	getCatalogLinkedPrNumbers,
	getCatalogTaskLinkedPrNumber,
	getSectionNumberForPr,
	ROADMAP_CATALOG,
	sectionUsesPerTaskPrCompletion,
} from "./catalog";

describe("roadmap catalog PR links", () => {
	it("returns the newest catalog PR for section 0", () => {
		expect(getCatalogLinkedPrNumber(0)).toBe(49);
	});

	it("returns the newest catalog PR for section 3 (calendar split)", () => {
		expect(getCatalogLinkedPrNumbers(3)).toEqual([51, 55, 57, 58, 60]);
		expect(getCatalogLinkedPrNumber(3)).toBe(60);
	});

	it("keeps sections in dependency order", () => {
		expect(ROADMAP_CATALOG.map((s) => s.title)).toEqual([
			"Roadmap Engine",
			"Trust & Security Foundations",
			"Audit, Compliance Evidence & Theater Removal",
			"Scalability & Technical Debt Remediation",
			"Monetization Enforcement",
			"Clause Library, Templates & AI Playbooks",
			"CRM/ERP Origin Integrations",
			"Negotiation & Authoring Workspace",
			"Configurable Approval Workflows",
			"Execution: Real E-Signature",
			"Obligation Management System",
			"Growth-Tier API, Webhooks & IT/HR Surface",
			"Enterprise Identity: SSO / SAML / SCIM",
			"Data Portability & Regulatory Readiness",
			"Operational Readiness: SLA, Status, SOC 2",
			"Positioning & Packaging Cleanup",
		]);
	});

	it("does not reuse a PR number across sections", () => {
		expect(findDuplicateCatalogPrNumbers()).toEqual([]);
	});

	it("resolves a catalog PR to exactly one section", () => {
		expect(getSectionNumberForPr(49)).toBe(0);
		expect(getSectionNumberForPr(52)).toBe(1);
		expect(getSectionNumberForPr(9999)).toBeUndefined();
	});

	it("maps section 1 tasks to catalog PRs", () => {
		expect(getCatalogTaskLinkedPrNumber("1.1")).toBe(52);
		expect(getCatalogTaskLinkedPrNumber("1.2")).toBe(54);
		expect(getCatalogTaskLinkedPrNumber("1.3")).toBe(56);
		expect(getCatalogTaskLinkedPrNumber("1.4")).toBe(59);
		expect(sectionUsesPerTaskPrCompletion(1)).toBe(true);
		expect(sectionUsesPerTaskPrCompletion(0)).toBe(false);
	});

	it("includes dedicated GitHub tracking PRs 61-65", () => {
		expect(getCatalogLinkedPrNumbers(5)).toEqual([63]);
		expect(getCatalogLinkedPrNumbers(6)).toEqual([64]);
		expect(getCatalogLinkedPrNumbers(7)).toEqual([62]);
		expect(getCatalogLinkedPrNumbers(9)).toEqual([61]);
		expect(getCatalogLinkedPrNumbers(15)).toEqual([65]);
	});
});

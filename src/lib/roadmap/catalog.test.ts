import { describe, expect, it } from "vitest";
import {
	displayedPrNumberForTask,
	findDuplicateCatalogPrNumbers,
	getCatalogLinkedPrNumber,
	getCatalogLinkedPrNumbers,
	getCatalogTaskLinkedPrNumber,
	getSectionNumberForPr,
	getUnlinkedCatalogTaskCodes,
	ROADMAP_CATALOG,
	sectionCompletesOnMergedCatalogPr,
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

	it("maps section 3 calendar-split tasks to catalog PRs", () => {
		expect(getCatalogTaskLinkedPrNumber("3.1")).toBe(51);
		expect(getCatalogTaskLinkedPrNumber("3.2")).toBe(55);
		expect(getCatalogTaskLinkedPrNumber("3.3")).toBe(57);
		expect(getCatalogTaskLinkedPrNumber("3.4")).toBe(58);
		expect(getCatalogTaskLinkedPrNumber("3.5")).toBe(60);
		expect(sectionUsesPerTaskPrCompletion(3)).toBe(true);
		expect(getUnlinkedCatalogTaskCodes(3)).toEqual([]);
	});

	it("maps section 10 obligation tasks to catalog PRs", () => {
		expect(getCatalogTaskLinkedPrNumber("10.1")).toBe(20);
		expect(getCatalogTaskLinkedPrNumber("10.2")).toBe(27);
		expect(getCatalogTaskLinkedPrNumber("10.3")).toBe(32);
		expect(getCatalogTaskLinkedPrNumber("10.4")).toBe(32);
		expect(getCatalogTaskLinkedPrNumber("10.5")).toBe(32);
		expect(sectionUsesPerTaskPrCompletion(10)).toBe(true);
	});

	it("includes dedicated GitHub tracking PRs 61-65", () => {
		expect(getCatalogLinkedPrNumbers(5)).toEqual([67, 68, 69, 70]);
		expect(getCatalogLinkedPrNumbers(6)).toEqual([64]);
		expect(getCatalogLinkedPrNumbers(7)).toEqual([62]);
		expect(getCatalogLinkedPrNumbers(9)).toEqual([61]);
		expect(getCatalogLinkedPrNumbers(15)).toEqual([65]);
	});

	it("binds section 5 per-task PRs 67-70", () => {
		expect(getCatalogTaskLinkedPrNumber("5.1")).toBe(67);
		expect(getCatalogTaskLinkedPrNumber("5.2")).toBe(68);
		expect(getCatalogTaskLinkedPrNumber("5.3")).toBe(69);
		expect(getCatalogTaskLinkedPrNumber("5.4")).toBe(70);
		expect(getUnlinkedCatalogTaskCodes(5)).toEqual(["5.5"]);
		expect(sectionUsesPerTaskPrCompletion(5)).toBe(true);
		expect(sectionCompletesOnMergedCatalogPr(5)).toBe(true);
		expect(getSectionNumberForPr(63)).toBeUndefined();
		expect(getSectionNumberForPr(68)).toBe(5);
	});

	it("does not show merged stub 63 when catalog has per-task PRs", () => {
		expect(displayedPrNumberForTask("5.1", 63)).toBe(67);
		expect(displayedPrNumberForTask("5.2", 63)).toBe(68);
		expect(displayedPrNumberForTask("5.3", 63)).toBe(69);
		expect(displayedPrNumberForTask("5.4", 63)).toBe(70);
	});
});

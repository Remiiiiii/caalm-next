import { describe, expect, it } from "vitest";
import type { AuditReadinessDomain } from "@/lib/analytics/audit-readiness.types";
import {
	buildReadinessAssistantStructured,
	domainTileBadge,
	formatModuleBlurb,
	formatModuleHeadingName,
	formatPriorityAffects,
	formatPriorityDueLabel,
	formatPriorityInstruction,
	formatReadinessScopeLine,
	formatSiteHost,
	formatSourceLine,
	overallTileBadge,
} from "@/lib/audits/readiness/summary-tiles";
import type { AuditReadinessSnapshotPayload } from "@/lib/audits/readiness/types";

const contractsDomain: AuditReadinessDomain = {
	domain: "contracts",
	label: "Contracts & grants",
	readinessPercent: 0,
	ragStatus: "red",
	evidenceCount: 1,
	atRiskCount: 1,
	modulePath: "/contracts",
};

const licensesDomain: AuditReadinessDomain = {
	domain: "licenses",
	label: "Licenses",
	readinessPercent: 100,
	ragStatus: "green",
	evidenceCount: 2,
	atRiskCount: 0,
	modulePath: "/licenses",
};

describe("readiness assistant tiles", () => {
	it("labels overall RAG in title case", () => {
		expect(overallTileBadge("red")).toEqual({ label: "Red", rag: "red" });
	});

	it("labels a healthy domain as No risk", () => {
		expect(domainTileBadge(licensesDomain, [])).toEqual({
			label: "No risk",
			rag: "green",
		});
	});

	it("labels a contracts gap with the insight severity", () => {
		expect(
			domainTileBadge(contractsDomain, [
				{
					id: "1",
					title: "Action required",
					description: "",
					severity: "moderate",
					moduleLink: "/contracts",
					moduleLabel: "Contracts",
					itemKind: "contract",
				},
			]),
		).toEqual({ label: "Gap · moderate", rag: "red" });
	});

	it("builds the scope line from sources and counts", () => {
		expect(
			formatReadinessScopeLine({
				sourcesUsed: ["Contracts", "Licenses"],
				expiringSoon: 1,
				upcomingDeadlines: 1,
			}),
		).toBe(
			"Scope: Contracts and Licenses only · 1 expiring item · 1 upcoming deadline",
		);
	});

	it("formats the due pill as Due Month Day, Year", () => {
		expect(formatPriorityDueLabel("2027-09-30")).toBe("Due Sep 30, 2027");
		expect(
			formatPriorityDueLabel(
				undefined,
				"action-required · Executive · due Sep 30, 2027",
			),
		).toBe("Due Sep 30, 2027");
	});

	it("writes a plain-language priority instruction", () => {
		expect(
			formatPriorityInstruction({
				category: "action-required",
				itemKind: "contract",
			}),
		).toBe(
			"Action required. Update the contract documentation and milestones.",
		);
	});

	it("maps audit-type tags to stacked Affects labels", () => {
		expect(
			formatPriorityAffects(
				["hrsa_osv", "cw_monitoring", "financial_pbc"],
				"contract",
			),
		).toEqual([
			"HRSA written service agreements",
			"Child-welfare provider contracts",
			"PBC grant / vendor contracts",
		]);
	});

	it("shortens module headings and writes by-module blurbs", () => {
		expect(formatModuleHeadingName("Contracts & grants")).toBe("Contracts");
		expect(formatModuleHeadingName("Licenses")).toBe("Licenses");
		expect(
			formatModuleBlurb({
				domain: "contracts",
				atRiskCount: 1,
				upcomingDeadlines: 1,
			}),
		).toBe("1 action-required item (see above) and 1 upcoming deadline.");
		expect(
			formatModuleBlurb({ domain: "licenses", atRiskCount: 0 }),
		).toBe(
			"No licenses at risk. Supports HRSA credentialing, child-welfare facility licensing, staff credentials and PBC insurance documentation.",
		);
	});

	it("formats the source line and public-site host", () => {
		expect(formatSourceLine(["Contracts", "Licenses"])).toBe(
			"Source: Contracts and Licenses records",
		);
		expect(formatSiteHost("https://www.example.org/about")).toBe("example.org");
	});

	it("builds the assistant layout from a saved snapshot payload", () => {
		const payload = {
			sourcesUsed: ["Contracts", "Licenses"],
			summary: {
				readinessScore: 50,
				ragStatus: "red",
				kpis: { expiringSoon: 1, upcomingDeadlines: 1 },
				insights: [
					{
						id: "1",
						title: "Action required",
						itemTitle: "Solvent Technologies",
						description: "action-required · due 2027-09-30",
						severity: "moderate",
						moduleLink: "/contracts",
						moduleLabel: "Contracts",
						itemKind: "contract",
						dueDate: "2027-09-30",
						requirementTags: ["hrsa_osv"],
					},
				],
				domains: [contractsDomain, licensesDomain],
			},
			siteCrawl: {
				websiteUrl: "https://www.example.org",
				sitemapFound: true,
				pages: [{}, {}, {}, {}],
				healthHint: "needs_attention",
			},
		} as unknown as AuditReadinessSnapshotPayload;

		const structured = buildReadinessAssistantStructured(payload);
		expect(structured.overallScore).toBe(50);
		expect(structured.byModule[0]?.name).toBe("Contracts");
		expect(structured.byModule[0]?.blurb).toBe(
			"1 action-required item (see above) and 1 upcoming deadline.",
		);
		expect(structured.sourceLine).toBe(
			"Source: Contracts and Licenses records",
		);
		expect(structured.publicSiteCrawl?.pagesCrawled).toBe(4);
	});
});

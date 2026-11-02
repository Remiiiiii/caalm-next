import { describe, expect, it } from "vitest";
import {
	classifyAuditReportText,
	parseAuditReportFindings,
} from "@/lib/audit-upload/parse-report-findings";
import { reconcileByRules } from "@/lib/audit-upload/reconcile-rules";
import { matchSampleReadinessSnapshot } from "@/lib/audit-upload/fixtures/readiness-snapshots";
import { scoreAuditRisk } from "@/lib/audit-upload/risk-score";

const SOC2_SNIPPET = `
STERLING & RHODES LLP
SOC 2 Type II Examination — Harborview Logistics, Inc.
REPORT NUMBER
SR-2026-0417
AUDIT PERIOD
October 1, 2025 – September 30, 2026
REPORT DATE
October 28, 2026
In our opinion, except for the matters described in Findings F-01 through F-06, the system met the applicable trust services criteria.

F-01 — Multi-factor authentication not enforced for remote administrative access
SEVERITY
High
CRITERIA
TSC CC6.1 — Logical access security controls
Condition
During testing of logical access controls in July 2026, we observed that administrative access to the Harborview TMS console obtained through the remote access gateway did not consistently require multi-factor authentication.
Auditor's Recommendation
Enforce multi-factor authentication for all remote administrative access paths.
Management Response
Management response: We disagree with this finding. The legacy VPN concentrator was decommissioned on January 15, 2026.

F-04 — Vulnerability scanning does not cover two recently added network subnets
SEVERITY
Low
CRITERIA
TSC CC7.1
Condition
Vulnerability scanning does not cover two recently added network subnets that are internet-facing.
Auditor's Recommendation
Scan the remaining subnets.
Management Response
Management response: We agree.

F-06 — Annual backup restoration testing not performed; estimated exposure $85,000
SEVERITY
Medium
CRITERIA
TSC A1.3
Condition
Annual backup restoration testing was not performed.
Auditor's Recommendation
Schedule restore tests.
Management Response
Management response: We agree.
`;

const SINGLE_SNIPPET = `
WHITCOMB, REYES & AMARAL, CPAs
Single Audit Report Under the Uniform Guidance (2 CFR Part 200, Subpart F)
REPORT NUMBER
WRA-2026-SA-118
AUDIT PERIOD
Fiscal year July 1, 2025 – June 30, 2026
Health Center Cluster (HRSA)93.224$2,418,300
Treatment Improvement — Substance Abuse (SAMHSA)93.243$385,600
HIV Prevention (CDC)93.939$148,750
Total federal expenditures$2,952,650
In our opinion, except for the matters described in Findings 2026-001 through 2026-006.

2026-002 — Cost transfers between awards lacked supporting documentation
SEVERITY
Low — Material weakness (per auditor)
CRITERIA
2 CFR 200.305, 200.308
Condition
We tested 41 cost transfers totaling $210,400 and found that 23 of the 41 lacked a documented justification. We question $46,500 of the transferred amounts as unsupported federal charges.
Auditor's Recommendation
Require a written justification.
Management Response
Management response: We agree with the finding.

2026-006 — Equipment inventory not reconciled (repeat of 2025-003)
SEVERITY
Medium — Significant deficiency
CRITERIA
2 CFR 200.313
Condition
Equipment inventory was not reconciled to the general ledger.
Auditor's Recommendation
Reconcile quarterly.
Management Response
Management response: We agree.
`;

describe("audit report parsing", () => {
	it("classifies a SOC 2 Type II sample", () => {
		const classified = classifyAuditReportText(SOC2_SNIPPET);
		expect(classified.auditType).toBe("soc2_type2");
		expect(classified.frameworks).toContain("SOC2");
		expect(classified.reportNumber).toBe("SR-2026-0417");
		expect(classified.periodStart).toBe("2025-10-01");
		expect(classified.periodEnd).toBe("2026-09-30");
		expect(classified.opinion).toBe("qualified");
	});

	it("extracts numbered SOC 2 findings, TSC refs, and exposure", () => {
		const extracted = parseAuditReportFindings(SOC2_SNIPPET);
		expect(extracted.findings.map((row) => row.findingCode)).toEqual([
			"F-01",
			"F-04",
			"F-06",
		]);
		const first = extracted.findings[0];
		expect(first?.frameworkRefs).toContain("CC6.1");
		expect(first?.severityReported).toBe("high");
		expect(first?.citations[0]?.quote).toMatch(/did not consistently require multi-factor/i);
		expect(extracted.findings[2]?.monetaryImpactUsd).toBe(85000);
	});

	it("extracts Uniform Guidance findings, SEFA, and questioned costs", () => {
		const classified = classifyAuditReportText(SINGLE_SNIPPET);
		expect(classified.auditType).toBe("compliance");
		expect(classified.frameworks).toContain("UNIFORM_GUIDANCE");
		const extracted = parseAuditReportFindings(SINGLE_SNIPPET);
		expect(extracted.sefa?.totalUsd).toBe(2952650);
		expect(extracted.sefa?.programs).toHaveLength(3);
		const costTransfers = extracted.findings.find(
			(row) => row.findingCode === "2026-002",
		);
		expect(costTransfers?.controlDeficiencyType).toBe("material_weakness");
		expect(costTransfers?.monetaryImpactUsd).toBe(46500);
		expect(
			extracted.findings.find((row) => row.findingCode === "2026-006")?.title,
		).toMatch(/repeat of 2025-003/i);
	});
});

describe("sample reconciliation rules", () => {
	it("flags SOC 2 mismatch, false finding, and untracked gaps", () => {
		const readiness = matchSampleReadinessSnapshot({
			fileName: "Sample_SOC_2_Type_II_Audit_Report__Harborview_Logistics_.pdf",
			auditType: "soc2_type2",
		});
		expect(readiness).toHaveLength(5);

		const mfa = reconcileByRules({
			title: "F-01 — Multi-factor authentication not enforced for remote administrative access",
			description: "legacy VPN concentrator",
			frameworkRefs: ["CC6.1"],
			severityReported: "high",
			severityComputed: "medium",
			readiness,
			periodStart: "2025-10-01",
		});
		expect(mfa.verdict).toBe("false_finding");

		const scan = scoreAuditRisk(4, 4);
		const scanVerdict = reconcileByRules({
			title: "F-04 — Vulnerability scanning does not cover two recently added network subnets",
			description: "internet-facing unscanned assets",
			frameworkRefs: ["CC7.1"],
			severityReported: "low",
			severityComputed: scan.computedSeverity,
			readiness,
			periodStart: "2025-10-01",
		});
		expect(scan.computedSeverity).toBe("high");
		expect(scanVerdict.verdict).toBe("severity_mismatch");

		const vendor = reconcileByRules({
			title: "F-05 — No documented termination checklist for SaaS vendor offboarding",
			description: "vendor offboarding",
			frameworkRefs: ["CC9.2"],
			severityReported: "medium",
			severityComputed: "medium",
			readiness,
		});
		expect(vendor.verdict).toBe("untracked_gap");

		const tabletop = reconcileByRules({
			title: "F-03 — Annual incident response tabletop exercise not evidenced for 2026",
			description: "annual tabletop exercise",
			frameworkRefs: ["CC7.4"],
			severityReported: "medium",
			severityComputed: "medium",
			readiness,
			periodStart: "2025-10-01",
		});
		expect(tabletop.verdict).toBe("stale_readiness");
	});

	it("flags Single Audit false finding, questioned-cost mismatch, and SEFA gap", () => {
		const readiness = matchSampleReadinessSnapshot({
			fileName: "Sample_Single_Audit_Report__Biscayne_Center_.pdf",
			frameworks: ["UNIFORM_GUIDANCE"],
		});
		expect(
			reconcileByRules({
				title: "2026-001 — Quarterly Federal Financial Report for the SAMHSA award filed late",
				description: "SF-425 filed late",
				frameworkRefs: ["2 CFR 200.344"],
				severityReported: "medium",
				severityComputed: "medium",
				readiness,
				periodStart: "2025-07-01",
			}).verdict,
		).toBe("false_finding");

		const costScore = scoreAuditRisk(4, 4);
		expect(
			reconcileByRules({
				title: "2026-002 — Cost transfers between awards lacked supporting documentation",
				description: "cost transfers between federal awards",
				frameworkRefs: ["2 CFR 200.305"],
				severityReported: "low",
				severityComputed: costScore.computedSeverity,
				readiness,
			}).verdict,
		).toBe("severity_mismatch");

		expect(
			reconcileByRules({
				title: "2026-004 — SEFA misclassification of CDC award expenditures",
				description: "schedule of expenditures of federal awards mapping",
				frameworkRefs: ["UNIFORM_GUIDANCE"],
				severityReported: "medium",
				severityComputed: "medium",
				readiness,
			}).verdict,
		).toBe("untracked_gap");
	});
});

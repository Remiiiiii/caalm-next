import type { ReadinessItem } from "../types";

export const SOC2_SAMPLE_SNAPSHOT: ReadinessItem[] = [
	{
		requirementId: "rdy-001",
		label: "MFA enforced for remote administrative access (Okta)",
		status: "ready",
		evidenceDate: "2026-09-15",
		notes:
			"Okta policy export plus decommissioning ticket; legacy VPN concentrator retired 2026-01-15.",
	},
	{
		requirementId: "rdy-002",
		label: "Quarterly user access reviews for the warehouse management system",
		status: "gap",
	},
	{
		requirementId: "rdy-003",
		label: "Annual incident response tabletop exercise",
		status: "ready",
		evidenceDate: "2025-08-12",
		notes: "Evidence is the 2025 exercise only.",
	},
	{
		requirementId: "rdy-004",
		label: "Vulnerability scanning coverage of all network subnets",
		status: "in_progress",
	},
	{
		requirementId: "rdy-005",
		label: "Annual backup restoration testing",
		status: "gap",
	},
];

export const SINGLE_AUDIT_SAMPLE_SNAPSHOT: ReadinessItem[] = [
	{
		requirementId: "rdy-fra-001",
		label: "Quarterly SF-425 Federal Financial Report timely filing",
		status: "ready",
		evidenceDate: "2026-01-22",
		notes:
			"Grants.gov confirmation 2026-01-22. The March 3 document was an amended resubmission.",
	},
	{
		requirementId: "rdy-fra-002",
		label: "Cost transfer documentation between federal awards",
		status: "gap",
	},
	{
		requirementId: "rdy-fra-003",
		label: "Background screening renewals for direct-care staff",
		status: "ready",
		evidenceDate: "2026-06-15",
		notes: "HRIS report excludes rehired staff, the population the auditor tested.",
	},
	{
		requirementId: "rdy-fra-004",
		label: "Micro-purchase price documentation",
		status: "gap",
	},
	{
		requirementId: "rdy-fra-005",
		label: "Equipment inventory reconciliation",
		status: "gap",
	},
];

export function matchSampleReadinessSnapshot(input: {
	fileName?: string | null;
	auditType?: string | null;
	frameworks?: string[];
	auditorName?: string | null;
	reportNumber?: string | null;
}): ReadinessItem[] {
	const haystack = [
		input.fileName,
		input.auditType,
		input.auditorName,
		input.reportNumber,
		...(input.frameworks ?? []),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (
		/harborview|soc\s*2|sterling|sr-2026-0417/.test(haystack) ||
		input.auditType === "soc2_type2"
	) {
		return SOC2_SAMPLE_SNAPSHOT;
	}
	if (
		/biscayne|single.?audit|uniform.?guidance|whitcomb|wra-2026-sa-118/.test(
			haystack,
		) ||
		input.frameworks?.some((ref) =>
			/UNIFORM_GUIDANCE|2\s*CFR/i.test(ref),
		)
	) {
		return SINGLE_AUDIT_SAMPLE_SNAPSHOT;
	}
	return [];
}

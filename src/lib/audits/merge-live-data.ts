import { dedupeEvidenceRows } from "@/lib/audits/evidence-utils";
import { getAuditDomainData } from "@/lib/audits/mock-data";
import type {
	AuditDomainData,
	AuditKpi,
	ComplianceStatusSnapshot,
} from "@/lib/audits/types";

const CHART_FILLS = ["#03AFBF", "#F59E0B", "#EF4444", "#524E4E"];

function buildContractKpis(snapshot: ComplianceStatusSnapshot): AuditKpi[] {
	const contracts = snapshot.contracts;
	if (!contracts) {
		return getAuditDomainData("contracts").kpis;
	}

	return [
		{
			id: "rate",
			title: "Compliance rate",
			value: `${contracts.complianceRate}%`,
			description: "Up-to-date contracts",
			trend: "Live",
			trendDirection:
				contracts.complianceRate >= 85
					? "up"
					: contracts.complianceRate >= 70
						? "neutral"
						: "down",
			ragStatus:
				contracts.complianceRate >= 85
					? "green"
					: contracts.complianceRate >= 70
						? "amber"
						: "red",
		},
		{
			id: "action",
			title: "Action required",
			value: String(contracts.buckets["action-required"] ?? 0),
			description: "Needs follow-up",
			trendDirection: "neutral",
		},
		{
			id: "noncompliant",
			title: "Non-compliant",
			value: String(contracts.buckets["non-compliant"] ?? 0),
			description: "Critical gaps",
			trendDirection:
				(contracts.buckets["non-compliant"] ?? 0) > 0 ? "down" : "neutral",
		},
		{
			id: "expiring",
			title: "Expiring soon",
			value: String(contracts.expiringSoon),
			description: "Within 90 days",
			trendDirection: contracts.expiringSoon > 0 ? "up" : "neutral",
		},
	];
}

function buildLicenseKpis(snapshot: ComplianceStatusSnapshot): AuditKpi[] {
	const licenses = snapshot.licenses;
	if (!licenses) {
		return getAuditDomainData("licenses").kpis;
	}

	const compliant = licenses.complianceBuckets.compliant ?? 0;
	const renewalHealth =
		licenses.total > 0 ? Math.round((compliant / licenses.total) * 100) : 0;

	return [
		{
			id: "active",
			title: "Active licenses",
			value: String(licenses.active),
			description: "Currently valid",
			trendDirection: "neutral",
		},
		{
			id: "expiring",
			title: "Expiring in 30 days",
			value: String(licenses.expiringSoon),
			description: "Renewal needed",
			trendDirection: licenses.expiringSoon > 0 ? "up" : "neutral",
			ragStatus: licenses.expiringSoon > 3 ? "amber" : "green",
		},
		{
			id: "atrisk",
			title: "At risk",
			value: String(licenses.atRisk),
			description: "Action required",
			trendDirection: licenses.atRisk > 0 ? "down" : "neutral",
		},
		{
			id: "renewal",
			title: "Renewal health",
			value: `${renewalHealth}%`,
			description: "On-time renewals",
			trend: "Live",
			trendDirection:
				renewalHealth >= 85 ? "up" : renewalHealth >= 70 ? "neutral" : "down",
			ragStatus:
				renewalHealth >= 85 ? "green" : renewalHealth >= 70 ? "amber" : "red",
		},
	];
}

function buildContractDonut(snapshot: ComplianceStatusSnapshot) {
	const contracts = snapshot.contracts;
	if (!contracts) return getAuditDomainData("contracts").donut;

	return [
		{
			name: "Up-to-date",
			value: contracts.buckets["up-to-date"] ?? 0,
			fill: CHART_FILLS[0],
		},
		{
			name: "Action required",
			value: contracts.buckets["action-required"] ?? 0,
			fill: CHART_FILLS[1],
		},
		{
			name: "Non-compliant",
			value: contracts.buckets["non-compliant"] ?? 0,
			fill: CHART_FILLS[2],
		},
		{
			name: "Unknown",
			value: contracts.buckets.unknown ?? 0,
			fill: CHART_FILLS[3],
		},
	].filter((item) => item.value > 0);
}

function buildLicenseDonut(snapshot: ComplianceStatusSnapshot) {
	const licenses = snapshot.licenses;
	if (!licenses) return getAuditDomainData("licenses").donut;

	return [
		{
			name: "Compliant",
			value: licenses.complianceBuckets.compliant ?? 0,
			fill: CHART_FILLS[0],
		},
		{
			name: "At risk",
			value: licenses.complianceBuckets["at-risk"] ?? 0,
			fill: CHART_FILLS[1],
		},
		{
			name: "Action required",
			value: licenses.complianceBuckets["action-required"] ?? 0,
			fill: CHART_FILLS[1],
		},
		{
			name: "Non-compliant",
			value: licenses.complianceBuckets["non-compliant"] ?? 0,
			fill: CHART_FILLS[2],
		},
	].filter((item) => item.value > 0);
}

export function mergeDomainWithLiveData(
	domain: AuditDomainData["domain"],
	snapshot: ComplianceStatusSnapshot | null,
): AuditDomainData {
	const base = getAuditDomainData(domain);
	if (!snapshot) return base;

	if (domain === "contracts" && snapshot.contracts) {
		return {
			...base,
			kpis: buildContractKpis(snapshot),
			donut: buildContractDonut(snapshot),
			evidence: dedupeEvidenceRows(
				snapshot.contracts.evidence.length > 0
					? snapshot.contracts.evidence
					: base.evidence,
			),
		};
	}

	if (domain === "licenses" && snapshot.licenses) {
		return {
			...base,
			kpis: buildLicenseKpis(snapshot),
			donut: buildLicenseDonut(snapshot),
			evidence: dedupeEvidenceRows(
				snapshot.licenses.evidence.length > 0
					? snapshot.licenses.evidence
					: base.evidence,
			),
		};
	}

	return base;
}

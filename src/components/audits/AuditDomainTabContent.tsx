"use client";

import { useMemo } from "react";
import { AuditDomainCharts } from "@/components/audits/AuditDomainCharts";
import { AuditEvidenceTable } from "@/components/audits/AuditEvidenceTable";
import { AuditStatCardRow } from "@/components/audits/AuditStatCardRow";
import {
	getAuditDomainData,
	getTimeSeriesForPeriod,
} from "@/lib/audits/mock-data";
import type { AuditControlDomain, AuditPeriod } from "@/lib/audits/types";

const CHART_TITLES: Record<
	AuditControlDomain,
	{ time: string; breakdown: string; donut: string }
> = {
	financial: {
		time: "Control testing trend",
		breakdown: "Exceptions by account area",
		donut: "Assertion coverage",
	},
	documents: {
		time: "Document intake over time",
		breakdown: "Documents by category",
		donut: "Evidence completeness",
	},
	administrative: {
		time: "Administrative findings trend",
		breakdown: "Findings by department",
		donut: "Policy compliance",
	},
	it: {
		time: "Access review completion",
		breakdown: "Failed auth events by role",
		donut: "Access review status",
	},
	vendor: {
		time: "RFP cycle time trend",
		breakdown: "Vendors by lifecycle stage",
		donut: "Vendor risk tier",
	},
};

interface AuditDomainTabContentProps {
	domain: AuditControlDomain;
	period: AuditPeriod;
	search: string;
}

export function AuditDomainTabContent({
	domain,
	period,
	search,
}: AuditDomainTabContentProps) {
	const data = getAuditDomainData(domain);
	const timeSeries = getTimeSeriesForPeriod(domain, period);
	const titles = CHART_TITLES[domain];

	const filteredEvidence = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return data.evidence;
		return data.evidence.filter(
			(row) =>
				row.title.toLowerCase().includes(q) ||
				row.owner.toLowerCase().includes(q) ||
				row.id.toLowerCase().includes(q),
		);
	}, [data.evidence, search]);

	return (
		<div className="space-y-6">
			<AuditStatCardRow kpis={data.kpis} />
			<AuditDomainCharts
				timeSeries={timeSeries}
				breakdown={data.breakdown}
				donut={data.donut}
				timeSeriesTitle={titles.time}
				breakdownTitle={titles.breakdown}
				donutTitle={titles.donut}
			/>
			<AuditEvidenceTable rows={filteredEvidence} logDomain={domain} />
		</div>
	);
}

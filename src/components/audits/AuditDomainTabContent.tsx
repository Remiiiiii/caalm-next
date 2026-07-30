"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AuditDomainCharts } from "@/components/audits/AuditDomainCharts";
import { AuditEvidenceTable } from "@/components/audits/AuditEvidenceTable";
import { AuditStatCardRow } from "@/components/audits/AuditStatCardRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useComplianceStatus } from "@/hooks/useComplianceStatus";
import { dedupeEvidenceRows } from "@/lib/audits/evidence-utils";
import { mergeDomainWithLiveData } from "@/lib/audits/merge-live-data";
import { getTimeSeriesForPeriod } from "@/lib/audits/mock-data";
import type { AuditControlDomain, AuditPeriod } from "@/lib/audits/types";

const CHART_TITLES: Record<
	AuditControlDomain,
	{ time: string; breakdown: string; donut: string }
> = {
	regulatory: {
		time: "Filing timeliness trend",
		breakdown: "Obligations by filing type",
		donut: "Deadline status (RAG)",
	},
	contracts: {
		time: "Contract compliance trend",
		breakdown: "Contracts by type",
		donut: "Compliance distribution",
	},
	licenses: {
		time: "License renewal completion",
		breakdown: "Licenses by category",
		donut: "License compliance status",
	},
	documents: {
		time: "Evidence collection over time",
		breakdown: "Documents by category",
		donut: "Evidence completeness",
	},
	governance: {
		time: "Training & policy completion",
		breakdown: "Action items by department",
		donut: "Governance compliance",
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
	const { snapshot } = useComplianceStatus();
	const data = useMemo(
		() => mergeDomainWithLiveData(domain, snapshot),
		[domain, snapshot],
	);
	const timeSeries = getTimeSeriesForPeriod(domain, period);
	const titles = CHART_TITLES[domain];

	const filteredEvidence = useMemo(() => {
		const q = search.trim().toLowerCase();
		const rows = !q
			? data.evidence
			: data.evidence.filter(
					(row) =>
						row.title.toLowerCase().includes(q) ||
						row.owner.toLowerCase().includes(q) ||
						row.id.toLowerCase().includes(q),
				);
		return dedupeEvidenceRows(rows);
	}, [data.evidence, search]);

	return (
		<div className="space-y-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">
							CAALM module: {data.caalmModule}
						</p>
						<p className="text-xs text-slate-600 mt-1">{data.description}</p>
					</div>
					<Button
						variant="outline"
						className="primary-btn px-3 sm:px-4 shrink-0"
						asChild
					>
						<Link href={data.modulePath}>
							Open {data.caalmModule}
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</CardContent>
			</Card>

			<AuditStatCardRow kpis={data.kpis} />
			<AuditDomainCharts
				timeSeries={timeSeries}
				breakdown={data.breakdown}
				donut={data.donut}
				timeSeriesTitle={titles.time}
				breakdownTitle={titles.breakdown}
				donutTitle={titles.donut}
			/>
			<AuditEvidenceTable
				rows={filteredEvidence}
				logDomain={domain}
				title="Compliance obligations"
			/>
		</div>
	);
}

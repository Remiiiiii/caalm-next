"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { DepartmentMonitoringDomain } from "@/lib/dashboard/department-dashboard.types";

interface DepartmentMonitoringGridProps {
	monitoring: {
		contracts: DepartmentMonitoringDomain;
		calendar: DepartmentMonitoringDomain;
		licenses: DepartmentMonitoringDomain;
		documents: DepartmentMonitoringDomain;
	};
}

function MonitoringCard({ domain }: { domain: DepartmentMonitoringDomain }) {
	const total = Math.max(domain.total, 0);
	const okPct =
		total > 0 ? Math.round((domain.ok / total) * 100) : domain.needsAttention === 0 ? 100 : 0;

	return (
		<Link
			href={domain.href}
			className="block min-w-0 h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 rounded-lg"
		>
			<Card className="glass-card interactive-glass-card h-full transition-all duration-200 hover:border-blue-300">
				<div className="glass-card-cap" />
				<CardContent className="p-4">
					<div className="flex items-center justify-between gap-2 mb-2">
						<p className="text-sm font-medium sidebar-gradient-text">
							{domain.label}
						</p>
						<span className="text-slate-400 text-sm">›</span>
					</div>
					<p className="text-xs text-slate-500">Needs attention</p>
					<p className="text-2xl font-bold text-slate-700 pt-1">
						{domain.needsAttention}
					</p>
					<div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
						<div
							className="h-full rounded-full bg-green transition-all duration-200"
							style={{ width: `${okPct}%` }}
						/>
					</div>
					<div className="mt-2 flex items-center justify-between text-xs text-slate-600">
						<span>{domain.ok} OK</span>
						<span>{total} total</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

export function DepartmentMonitoringGrid({
	monitoring,
}: DepartmentMonitoringGridProps) {
	const domains = [
		monitoring.contracts,
		monitoring.calendar,
		monitoring.licenses,
		monitoring.documents,
	];

	return (
		<div className="h-full w-full flex flex-col space-y-3">
			<div className="shrink-0">
				<p className="text-sm font-medium sidebar-gradient-text">Monitoring</p>
				<p className="text-xs text-slate-600 mt-1">
					Division domains that need follow-up
				</p>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 content-stretch">
				{domains.map((domain) => (
					<MonitoringCard key={domain.label} domain={domain} />
				))}
			</div>
		</div>
	);
}

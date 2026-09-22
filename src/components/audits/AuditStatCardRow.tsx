"use client";

import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	FileText,
	Minus,
	Scale,
	Shield,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { MetricStatCard, type MetricTone } from "@/components/ui/metric-stat-card";
import type { AuditKpi } from "@/lib/audits/types";

interface AuditStatCardRowProps {
	kpis: AuditKpi[];
}

const KPI_ICONS: Record<string, LucideIcon> = {
	filings: Shield,
	deadlines: Clock,
	registrations: CheckCircle2,
	findings: AlertTriangle,
	rate: Scale,
	action: FileText,
	noncompliant: AlertTriangle,
	expiring: Clock,
	active: CheckCircle2,
	atrisk: AlertTriangle,
};

export function AuditStatCardRow({ kpis }: AuditStatCardRowProps) {
	return (
		<div className="grid grid-cols-4 gap-6 mb-6">
			{kpis.map((kpi) => {
				const ragTone: MetricTone | undefined =
					kpi.ragStatus === "red"
						? "danger"
						: kpi.ragStatus === "amber"
							? "warning"
							: kpi.ragStatus === "green"
								? "success"
								: undefined;
				const DynamicIcon =
					kpi.trendDirection === "up"
						? TrendingUp
						: kpi.trendDirection === "down"
							? TrendingDown
							: kpi.trend
								? Minus
								: undefined;
				const dynamicTone: MetricTone =
					ragTone ??
					(kpi.trendDirection === "up"
						? "success"
						: kpi.trendDirection === "down"
							? "danger"
							: "default");

				return (
					<MetricStatCard
						key={kpi.id}
						title={kpi.title}
						value={kpi.value}
						description={
							kpi.trend ? `${kpi.description} · ${kpi.trend}` : kpi.description
						}
						icon={KPI_ICONS[kpi.id] ?? FileText}
						iconTone={ragTone}
						dynamicIcon={DynamicIcon}
						dynamicTone={dynamicTone}
						valueTone={ragTone === "danger" ? "danger" : "default"}
					/>
				);
			})}
		</div>
	);
}

"use client";

export const dynamic = "force-dynamic";

import {
	AlertCircle,
	Calendar,
	CheckCircle,
	ClipboardCheck,
	SquareArrowRightExit,
	Loader2,
	Shield,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import useSWR from "swr";
import { AnalyticsFilterBar } from "@/components/analytics/AnalyticsFilterBar";
import { AnalyticsInsightsList } from "@/components/analytics/AnalyticsInsightsList";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";
import { AnalyticsStatCard } from "@/components/analytics/AnalyticsStatCard";
import { AuditReadinessHero } from "@/components/analytics/AuditReadinessHero";
import { CalendarAnalyticsDashboard } from "@/components/analytics/CalendarAnalyticsDashboard";
import { DomainReadinessGrid } from "@/components/analytics/DomainReadinessGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuditReadiness } from "@/hooks/useAuditReadiness";
import type { AuditReadinessSummary } from "@/lib/analytics/audit-readiness.types";
import type { AuditPeriod } from "@/lib/audits/types";
import { fetcher } from "@/lib/swr-config";

const formatCurrency = (amount: number): string => {
	if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
	if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
	return `$${amount.toFixed(0)}`;
};

function exportAuditPacket(summary: AuditReadinessSummary) {
	const rows = [
		["Audit Readiness Report", summary.lastUpdated],
		["Readiness Score", `${summary.readinessScore}%`],
		["Compliance Rate", `${summary.kpis.overallComplianceRate}%`],
		["Total Contracts", String(summary.kpis.totalContracts)],
		["Evidence Gaps", String(summary.kpis.evidenceGaps)],
		["Expiring Soon", String(summary.kpis.expiringSoon)],
		[],
		["Department", "Contracts", "Budget", "Compliance %"],
		...summary.departments.map((d) => [
			d.name,
			String(d.totalContracts),
			String(d.totalBudget),
			String(d.complianceRate),
		]),
	];

	const csv = rows.map((row) => row.join(",")).join("\n");
	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `audit-readiness-${new Date().toISOString().split("T")[0]}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}

const CSuitePage = () => {
	const [period, setPeriod] = useState<AuditPeriod>("90d");
	const { toast } = useToast();

	const { data: calendarData, isLoading: calendarLoading } = useSWR(
		"/api/analytics/calendar?days=90",
		fetcher,
		{ revalidateOnFocus: false },
	);

	const { summary, isLoading: readinessLoading } = useAuditReadiness({
		period,
		calendar: calendarData?.compliance
			? {
					complianceRate: calendarData.compliance.complianceRate ?? null,
					atRisk: calendarData.compliance.atRisk ?? 0,
					overdue: calendarData.compliance.overdue ?? 0,
				}
			: null,
	});

	const isLoading = readinessLoading || calendarLoading;

	const handleExport = () => {
		if (!summary) {
			toast({
				title: "Export unavailable",
				description: "Wait for data to load before exporting.",
				variant: "destructive",
			});
			return;
		}
		exportAuditPacket(summary);
		toast({
			title: "Export started",
			description: "Your audit readiness report is downloading.",
		});
	};

	return (
		<AnalyticsPageShell
			title="C suite analytics"
			subtitle="Executive-level insights and strategic metrics for audit readiness"
			actions={
				<Button
					variant="outline"
					className="primary-btn px-3 sm:px-4"
					onClick={handleExport}
					disabled={isLoading || !summary}
				>
					<SquareArrowRightExit className="h-4 w-4" />
					Export audit packet
				</Button>
			}
		>
			<AnalyticsFilterBar
				period={period}
				onPeriodChange={setPeriod}
				lastUpdated={summary?.lastUpdated}
				onExport={handleExport}
			/>

			<AuditReadinessHero
				score={summary?.readinessScore ?? 0}
				ragStatus={summary?.ragStatus ?? "amber"}
				areasAtRisk={
					(summary?.severity.critical ?? 0) + (summary?.severity.moderate ?? 0)
				}
				upcomingDeadlines={summary?.kpis.upcomingDeadlines ?? 0}
				isLoading={isLoading}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<AnalyticsStatCard
					title="Audit readiness"
					value={isLoading ? "—" : `${summary?.readinessScore ?? 0}%`}
					icon={ClipboardCheck}
				/>
				<AnalyticsStatCard
					title="Contract compliance"
					value={
						isLoading ? "—" : `${summary?.kpis.overallComplianceRate ?? 0}%`
					}
					icon={CheckCircle}
				/>
				<AnalyticsStatCard
					title="License renewal health"
					value={
						isLoading
							? "—"
							: `${summary?.complianceSnapshot.overview.licenseRenewalHealth ?? "—"}${summary?.complianceSnapshot.overview.licenseRenewalHealth != null ? "%" : ""}`
					}
					icon={Shield}
				/>
				<AnalyticsStatCard
					title="Calendar compliance"
					value={
						isLoading
							? "—"
							: summary?.calendar?.complianceRate != null
								? `${summary.calendar.complianceRate}%`
								: calendarData?.compliance?.complianceRate != null
									? `${calendarData.compliance.complianceRate}%`
									: "—"
					}
					icon={Calendar}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<h3 className="text-sm font-medium sidebar-gradient-text mb-4">
							Compliance trend
						</h3>
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="h-6 w-6 animate-spin text-slate-600" />
							</div>
						) : (
							<ResponsiveContainer width="100%" height={220}>
								<AreaChart data={summary?.trends.compliance ?? []}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
									<XAxis dataKey="label" tick={{ fontSize: 12 }} />
									<YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
									<Tooltip />
									<Area
										type="monotone"
										dataKey="value"
										stroke="#0f5384"
										fill="#0f5384"
										fillOpacity={0.15}
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				<AnalyticsInsightsList
					insights={summary?.insights ?? []}
					isLoading={isLoading}
					title="Strategic insights"
				/>
			</div>

			<div>
				<h2 className="text-xl font-semibold sidebar-gradient-text mb-4">
					Domain readiness
				</h2>
				<DomainReadinessGrid
					domains={summary?.domains ?? []}
					isLoading={isLoading}
				/>
			</div>

			{summary?.departments && summary.departments.length > 0 ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<h3 className="text-sm font-medium sidebar-gradient-text mb-4">
							Department comparison
						</h3>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b border-slate-200">
										<th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
											Department
										</th>
										<th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
											Contracts
										</th>
										<th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
											Budget
										</th>
										<th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
											Compliance
										</th>
										<th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
											Status
										</th>
									</tr>
								</thead>
								<tbody>
									{summary.departments.map((dept) => (
										<tr
											key={dept.name}
											className="border-b border-slate-100 hover:bg-blue/5 transition-colors duration-200 cursor-pointer"
										>
											<td className="py-3 px-4 text-sm text-slate-700 font-medium">
												{dept.name}
											</td>
											<td className="py-3 px-4 text-sm text-slate-700 text-right">
												{dept.totalContracts}
											</td>
											<td className="py-3 px-4 text-sm text-slate-700 text-right">
												{formatCurrency(dept.totalBudget)}
											</td>
											<td className="py-3 px-4 text-sm text-slate-700 text-right">
												{dept.complianceRate}%
											</td>
											<td className="py-3 px-4 text-center">
												{dept.complianceRate >= 90 ? (
													<Badge className="bg-green/10 text-green border-green/20">
														<CheckCircle className="h-3 w-3 mr-1" />
														Good
													</Badge>
												) : (
													<Badge className="bg-orange/10 text-orange border-orange/20">
														<AlertCircle className="h-3 w-3 mr-1" />
														Review
													</Badge>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			) : null}

			{calendarData?.compliance?.atRisk > 0 ||
			calendarData?.compliance?.overdue > 0 ? (
				<Card className="glass-card border-orange/20">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="flex items-start gap-3">
							<TrendingUp className="h-5 w-5 text-orange mt-0.5" />
							<div>
								<p className="font-semibold text-slate-700 mb-1">
									Calendar risk alert
								</p>
								<p className="text-sm text-slate-600">
									{calendarData.compliance.atRisk} deadlines at risk
									{calendarData.compliance.overdue > 0
										? ` · ${calendarData.compliance.overdue} overdue`
										: ""}
									. Current compliance rate:{" "}
									{calendarData.compliance.complianceRate}%.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			) : null}

			<div>
				<h2 className="text-xl font-semibold sidebar-gradient-text mb-4">
					Calendar performance
				</h2>
				<CalendarAnalyticsDashboard />
			</div>
		</AnalyticsPageShell>
	);
};

export default CSuitePage;

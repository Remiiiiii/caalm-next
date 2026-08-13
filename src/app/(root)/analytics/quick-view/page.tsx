"use client";

export const dynamic = "force-dynamic";

import {
	AlertCircle,
	BarChart3,
	ClipboardCheck,
	FileText,
	Shield,
	TrendingUp,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import useSWR from "swr";
import { AnalyticsInsightsList } from "@/components/analytics/AnalyticsInsightsList";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";
import { AnalyticsStatCard } from "@/components/analytics/AnalyticsStatCard";
import { AuditReadinessHero } from "@/components/analytics/AuditReadinessHero";
import { CalendarQuickStats } from "@/components/analytics/CalendarQuickStats";
import { Card, CardContent } from "@/components/ui/card";
import { useAuditReadiness } from "@/hooks/useAuditReadiness";
import { useUnifiedAnalyticsData } from "@/hooks/useUnifiedAnalyticsData";
import { fetcher } from "@/lib/swr-config";

const formatCurrency = (amount: number): string => {
	if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
	if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
	return `$${amount.toFixed(0)}`;
};

const QuickViewPage = () => {
	const {
		totals,
		hasContracts,
		isLoading: analyticsLoading,
		error: analyticsError,
	} = useUnifiedAnalyticsData();

	const { data: calendarData } = useSWR(
		"/api/analytics/calendar?days=90",
		fetcher,
		{ revalidateOnFocus: false },
	);

	const { summary, isLoading: readinessLoading } = useAuditReadiness({
		period: "30d",
		calendar: calendarData?.compliance
			? {
					complianceRate: calendarData.compliance.complianceRate ?? null,
					atRisk: calendarData.compliance.atRisk ?? 0,
					overdue: calendarData.compliance.overdue ?? 0,
				}
			: null,
	});

	const isLoading = analyticsLoading || readinessLoading;

	const complianceDonut = [
		{
			name: "Compliant",
			value:
				summary?.kpis.overallComplianceRate ?? totals.overallComplianceRate,
			fill: "#03AFBF",
		},
		{
			name: "Gap",
			value: Math.max(
				0,
				100 -
					(summary?.kpis.overallComplianceRate ?? totals.overallComplianceRate),
			),
			fill: "#F59E0B",
		},
	].filter((d) => d.value > 0);

	return (
		<AnalyticsPageShell
			title="Quick view analytics"
			subtitle="At-a-glance metrics and key performance indicators for audit readiness"
		>
			<AuditReadinessHero
				score={summary?.readinessScore ?? totals.overallComplianceRate}
				ragStatus={summary?.ragStatus ?? "amber"}
				areasAtRisk={summary?.severity.critical ?? 0}
				upcomingDeadlines={summary?.kpis.upcomingDeadlines ?? 0}
				isLoading={isLoading}
			/>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
				<AnalyticsStatCard
					title="Total contracts"
					value={
						isLoading
							? "—"
							: (summary?.kpis.totalContracts ?? totals.totalContracts)
					}
					icon={FileText}
				/>
				<AnalyticsStatCard
					title="Total budget"
					value={
						isLoading
							? "—"
							: formatCurrency(summary?.kpis.totalBudget ?? totals.totalBudget)
					}
					icon={TrendingUp}
				/>
				<AnalyticsStatCard
					title="Compliance rate"
					value={
						isLoading
							? "—"
							: `${summary?.kpis.overallComplianceRate ?? totals.overallComplianceRate}%`
					}
					icon={ClipboardCheck}
				/>
				<AnalyticsStatCard
					title="Licenses at risk"
					value={isLoading ? "—" : (summary?.kpis.licensesAtRisk ?? 0)}
					icon={Shield}
				/>
				<AnalyticsStatCard
					title="Expiring soon"
					value={isLoading ? "—" : (summary?.kpis.expiringSoon ?? 0)}
					description="Within 90 days"
					icon={AlertCircle}
				/>
				<AnalyticsStatCard
					title="Evidence gaps"
					value={isLoading ? "—" : (summary?.kpis.evidenceGaps ?? 0)}
					icon={BarChart3}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{hasContracts && !isLoading ? (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<h3 className="text-sm font-medium sidebar-gradient-text mb-4">
								Compliance breakdown
							</h3>
							{complianceDonut.length > 0 ? (
								<ResponsiveContainer width="100%" height={200}>
									<PieChart>
										<Pie
											data={complianceDonut}
											cx="50%"
											cy="50%"
											innerRadius={50}
											outerRadius={80}
											dataKey="value"
											paddingAngle={2}
										>
											{complianceDonut.map((entry) => (
												<Cell key={entry.name} fill={entry.fill} />
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
							) : (
								<p className="text-sm text-slate-600 text-center py-8">
									No compliance data yet
								</p>
							)}
						</CardContent>
					</Card>
				) : null}

				<CalendarQuickStats />
			</div>

			<AnalyticsInsightsList
				insights={summary?.insights ?? []}
				isLoading={isLoading}
				title="Priority alerts"
			/>

			{summary?.departments && summary.departments.length > 0 ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<h3 className="text-sm font-medium sidebar-gradient-text mb-4">
							Departments needing attention
						</h3>
						<div className="space-y-2">
							{summary.departments
								.filter((d) => d.complianceRate < 90)
								.sort((a, b) => a.complianceRate - b.complianceRate)
								.slice(0, 3)
								.map((dept) => (
									<div
										key={dept.name}
										className="flex items-center justify-between p-3 rounded-lg bg-white/50 border border-slate-200"
									>
										<span className="text-sm font-medium text-slate-700">
											{dept.name}
										</span>
										<span className="text-sm text-slate-600">
											{dept.complianceRate}% compliance
										</span>
									</div>
								))}
						</div>
					</CardContent>
				</Card>
			) : null}

			{analyticsError ? (
				<Card className="glass-card border-red/20">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm text-red">
							{typeof analyticsError === "string"
								? analyticsError
								: "Failed to load analytics data"}
						</p>
					</CardContent>
				</Card>
			) : null}
		</AnalyticsPageShell>
	);
};

export default QuickViewPage;

"use client";

import {
	AlertTriangle,
	Clock,
	Download,
	FileWarning,
	RefreshCw,
	Scale,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import type { PortfolioAccountabilityMetrics } from "@/lib/analytics/portfolioAccountability.types";
import { useOrganization } from "@/contexts/OrganizationContext";

type Period = "30d" | "90d" | "1y";

const CHART_COLORS = ["#0f5384", "#03AFBF", "#F59E0B", "#EF4444", "#10B981"];

async function fetcher(url: string) {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) throw new Error("Failed to load portfolio analytics");
	return res.json() as Promise<{
		success: boolean;
		metrics: PortfolioAccountabilityMetrics;
	}>;
}

function money(value: number): string {
	if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
	return `$${value.toLocaleString()}`;
}

export function PortfolioAccountabilityDashboard() {
	const { orgId } = useOrganization();
	const [period, setPeriod] = useState<Period>("30d");
	const url = orgId
		? `/api/analytics/portfolio-accountability?orgId=${encodeURIComponent(orgId)}&period=${period}`
		: `/api/analytics/portfolio-accountability?period=${period}`;
	const { data, error, isLoading } = useSWR(url, fetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 60000,
	});
	const metrics = data?.metrics;

	const exportCsv = () => {
		if (!metrics) return;
		const escapeCsv = (value: string | number) => {
			const str = String(value ?? "");
			return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
		};
		const sections = [
			["Portfolio accountability", metrics.periodStart, metrics.periodEnd].join(
				",",
			),
			["Portfolio", "Contracts", "Licenses", "Value"].join(","),
			[
				"Active",
				metrics.portfolio.contracts.active,
				metrics.portfolio.licenses.active,
				metrics.portfolio.totalValue,
			]
				.map(escapeCsv)
				.join(","),
			[
				"Expired",
				metrics.portfolio.contracts.expired,
				metrics.portfolio.licenses.expired,
				"",
			]
				.map(escapeCsv)
				.join(","),
			"",
			["Root cause", "Count"].join(","),
			...metrics.rootCause.map((row) =>
				[row.label, row.count].map(escapeCsv).join(","),
			),
			"",
			["Department", "Documents", "Expired", "Pending attestations", "Value"].join(
				",",
			),
			...metrics.departments.map((row) =>
				[
					row.department,
					row.documents,
					row.expired,
					row.pendingAttestations,
					row.value,
				]
					.map(escapeCsv)
					.join(","),
			),
		];
		const blob = new Blob([sections.join("\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const href = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = href;
		link.download = `portfolio-accountability-${period}.csv`;
		link.click();
		URL.revokeObjectURL(href);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<RefreshCw className="h-6 w-6 animate-spin text-[#0f5384]" />
				<span className="ml-3 text-slate-600">Loading portfolio analytics…</span>
			</div>
		);
	}

	if (error || !metrics) {
		return (
			<div className="rounded-lg border border-red/20 bg-red/5 p-6 text-center">
				<AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red" />
				<p className="text-sm text-slate-700">
					Could not load portfolio accountability metrics.
				</p>
			</div>
		);
	}

	const stats = [
		{
			title: "Documents",
			value: metrics.portfolio.totalDocuments,
			hint: `${metrics.portfolio.contracts.total} contracts · ${metrics.portfolio.licenses.total} licenses`,
			icon: Scale,
		},
		{
			title: "Value under management",
			value: money(metrics.portfolio.totalValue),
			hint: `${metrics.portfolio.contracts.active + metrics.portfolio.licenses.active} active`,
			icon: TrendingUp,
		},
		{
			title: "Processing time",
			value:
				metrics.velocity.avgDaysSubmitToActive != null
					? `${metrics.velocity.avgDaysSubmitToActive}d`
					: "—",
			hint:
				metrics.velocity.medianDaysSubmitToActive != null
					? `Median ${metrics.velocity.medianDaysSubmitToActive}d submit → active`
					: "Submit to active",
			icon: Clock,
		},
		{
			title: "Unintentional expirations",
			value: `${metrics.expiration.unintentionalRate}%`,
			hint: `${metrics.expiration.unintentional} of ${metrics.expiration.expiredInPeriod} expired in period`,
			icon: FileWarning,
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Portfolio accountability
					</h2>
					<p className="mt-1 text-sm text-slate-600">
						Processing speed, expiration outcomes, and who still owes an
						explanation.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<select
						value={period}
						onChange={(e) => setPeriod(e.target.value as Period)}
						className="h-10 rounded-md border-[0.25px] border-slate-300 bg-white px-3 text-sm text-slate-700"
					>
						<option value="30d">Last 30 days</option>
						<option value="90d">Last 90 days</option>
						<option value="1y">Last year</option>
					</select>
					<Button className="primary-btn px-3 sm:px-4" onClick={exportCsv}>
						<Download className="h-4 w-4" />
						Export CSV
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.title} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								{stat.title}
							</p>
							<div className="flex items-center pt-2 text-3xl font-bold text-slate-700">
								<span>{stat.value}</span>
								<StatCardIcon className="ml-2" icon={stat.icon} />
							</div>
							<p className="mt-1 text-xs text-slate-600">{stat.hint}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="mb-1 text-sm font-medium sidebar-gradient-text">
							Accountability debt
						</p>
						<p className="text-3xl font-bold text-slate-700 tabular-nums">
							{metrics.accountability.pending}
						</p>
						<p className="mt-1 text-xs text-slate-600">
							{metrics.accountability.overduePending} overdue ·{" "}
							{metrics.accountability.unattestedExpirations} still unexplained
						</p>
						<p className="mt-3 text-xs text-slate-500">
							Avg time to attest:{" "}
							{metrics.accountability.avgHoursToAttest != null
								? `${metrics.accountability.avgHoursToAttest}h`
								: "—"}
						</p>
					</CardContent>
				</Card>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="mb-1 text-sm font-medium sidebar-gradient-text">
							Open approval SLAs
						</p>
						<p className="text-3xl font-bold text-slate-700 tabular-nums">
							{metrics.velocity.sla.openItems}
						</p>
						<p className="mt-1 text-xs text-slate-600">
							{metrics.velocity.sla.breached} breached ·{" "}
							{metrics.velocity.sla.breachRate}% rate
						</p>
						<p className="mt-3 text-xs text-slate-500">
							Expired documents are left out of this count.
						</p>
					</CardContent>
				</Card>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="mb-1 text-sm font-medium sidebar-gradient-text">
							Renewal recovery
						</p>
						<p className="text-3xl font-bold text-slate-700 tabular-nums">
							{metrics.renewal.recoveryRate30}%
						</p>
						<p className="mt-1 text-xs text-slate-600">
							Renewed within 30 days of expiry
						</p>
						<p className="mt-3 text-xs text-slate-500">
							60d {metrics.renewal.within60} · 90d {metrics.renewal.within90} ·{" "}
							{metrics.renewal.renewedTotal} total
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="mb-4 text-sm font-medium sidebar-gradient-text">
							Expiration vs explanations
						</p>
						<div className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={metrics.trends}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
									<XAxis dataKey="label" tick={{ fontSize: 12 }} />
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip />
									<Line
										type="monotone"
										dataKey="expired"
										name="Expired"
										stroke="#EF4444"
										strokeWidth={2}
									/>
									<Line
										type="monotone"
										dataKey="attested"
										name="Attested"
										stroke="#0f5384"
										strokeWidth={2}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="mb-4 text-sm font-medium sidebar-gradient-text">
							Root cause
						</p>
						<div className="h-64">
							{metrics.rootCause.length === 0 ? (
								<p className="pt-16 text-center text-sm text-slate-500">
									No attestation reasons in this period yet.
								</p>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={metrics.rootCause} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
										<XAxis type="number" tick={{ fontSize: 12 }} />
										<YAxis
											type="category"
											dataKey="label"
											width={140}
											tick={{ fontSize: 11 }}
										/>
										<Tooltip />
										<Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
											{metrics.rootCause.map((_, index) => (
												<Cell
													key={metrics.rootCause[index].category}
													fill={CHART_COLORS[index % CHART_COLORS.length]}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<p className="mb-4 text-sm font-medium sidebar-gradient-text">
						Department drill-down
					</p>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200 text-left text-slate-600">
									<th className="py-2 pr-4 font-medium">Department</th>
									<th className="py-2 pr-4 font-medium">Documents</th>
									<th className="py-2 pr-4 font-medium">Expired</th>
									<th className="py-2 pr-4 font-medium">Pending attestations</th>
									<th className="py-2 font-medium">Value</th>
								</tr>
							</thead>
							<tbody>
								{metrics.departments.map((row) => (
									<tr
										key={row.department}
										className="border-b border-slate-100 text-slate-700"
									>
										<td className="py-2 pr-4">{row.department}</td>
										<td className="py-2 pr-4 tabular-nums">{row.documents}</td>
										<td className="py-2 pr-4 tabular-nums">{row.expired}</td>
										<td className="py-2 pr-4 tabular-nums">
											{row.pendingAttestations}
										</td>
										<td className="py-2 tabular-nums">{money(row.value)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

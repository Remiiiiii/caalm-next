/**
 * Rate Limit Monitoring Dashboard Component
 * Displays rate limit metrics and statistics
 */

"use client";

import {
	Activity,
	AlertTriangle,
	Clock,
	RefreshCw,
	Server,
	Shield,
	Trash2,
	TrendingUp,
	Users,
} from "lucide-react";
import { useState } from "react";
import { LoadError } from "@/components/LoadError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { StatCardSkeleton } from "@/components/ui/skeletons";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRateLimitMetrics } from "@/hooks/useRateLimitMetrics";
import { cn } from "@/lib/utils";

export default function RateLimitMonitoring() {
	const { metrics, isLoading, error, refresh, resetMetrics } =
		useRateLimitMetrics({
			enableRealTime: true,
			pollingInterval: 10000, // Refresh every 10 seconds
		});

	const { toast } = useToast();
	const [resetting, setResetting] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);

	const handleReset = async () => {
		setResetting(true);
		try {
			await resetMetrics();
			toast({
				title: "Success",
				description: "Rate limit metrics reset successfully",
			});
		} catch (_error) {
			throw new Error("Failed to reset metrics");
		} finally {
			setResetting(false);
		}
	};

	if (error) {
		return (
			<div className="glass-card w-full overflow-hidden">
				<div className="glass-card-cap" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<Shield className="w-5 h-5 text-[#0f5384]" />
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							Rate Limit Monitoring
						</h2>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<LoadError
						scale="section"
						title="We couldn't load rate limit metrics"
						elementKey="rate-limit-monitoring"
						error={{ requestPath: "/api/admin/rate-limits/metrics" }}
						onRetry={() => refresh()}
					/>
				</div>
			</div>
		);
	}

	if (isLoading && !metrics) {
		return (
			<div className="glass-card w-full overflow-hidden">
				<div className="glass-card-cap" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<Shield className="w-5 h-5 text-[#0f5384]" />
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							Rate Limit Monitoring
						</h2>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<div className="flex justify-center pb-4">
						<LoadingSpinner
							size="sm"
							label="Loading metrics..."
							className="!p-0"
						/>
					</div>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
						{[1, 2, 3, 4, 5].map((i) => (
							<StatCardSkeleton key={i} />
						))}
					</div>
				</div>
				<div className="glass-dialog-footer-wrap">
					<div className="text-xs text-slate-500">Loading metrics...</div>
				</div>
			</div>
		);
	}

	const summary = metrics?.summary || {
		totalRequests: 0,
		blockedRequests: 0,
		violations: 0,
		efficiency: "100%",
		averageLatency: "0ms",
	};

	const topViolators = metrics?.topViolators || [];
	const endpointStats = metrics?.endpointStats || {};

	return (
		<div className="glass-card w-full overflow-hidden">
			{/* Professional Cap */}
			<div className="glass-card-cap" />

			{/* Header with gradient background */}
			<div className="glass-dialog-wizard-header mt-4">
				<div className="flex items-center gap-3 px-6">
					{/* Title with icon */}
					<div className="flex items-center gap-3">
						<Shield className="w-5 h-5 text-[#0f5384]" />
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							Rate Limit Monitoring
						</h2>
					</div>
				</div>
				<p className="text-sm text-slate-600 mt-1 ml-14">
					Monitor API rate limiting performance and violations
				</p>
				<div className="flex items-center justify-end gap-2 px-6 mt-4 pb-2">
					<Button
						onClick={refresh}
						variant="outline"
						size="sm"
						className="primary-btn px-3 sm:px-4"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
					<Button
						onClick={() => setResetOpen(true)}
						variant="destructive"
						size="sm"
						disabled={resetting}
						className="primary-btn px-3 sm:px-4"
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Reset Metrics
					</Button>
				</div>
			</div>

			{/* Scrollable Content */}
			<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
				{/* Summary Cards */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
					<Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
						<div className="glass-card-cap" />
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
							<CardTitle className="text-sm font-medium sidebar-gradient-text">
								Total Requests
							</CardTitle>
							<Activity className="h-4 w-4 text-[#0f5384]" />
						</CardHeader>
						<CardContent className="bg-slate-50">
							<div className="text-2xl font-bold text-slate-700">
								{summary.totalRequests.toLocaleString()}
							</div>
							<p className="text-xs text-slate-600 mt-1">All API requests</p>
						</CardContent>
					</Card>

					<Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
						<div className="glass-card-cap" />
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
							<CardTitle className="text-sm font-medium sidebar-gradient-text">
								Blocked Requests
							</CardTitle>
							<Shield className="h-4 w-4 text-[#0f5384]" />
						</CardHeader>
						<CardContent className="bg-slate-50">
							<div className="text-2xl font-bold text-destructive">
								{summary.blockedRequests.toLocaleString()}
							</div>
							<p className="text-xs text-slate-600 mt-1">
								{summary.totalRequests > 0
									? (
											(summary.blockedRequests / summary.totalRequests) *
											100
										).toFixed(2)
									: 0}
								% of total
							</p>
						</CardContent>
					</Card>

					<Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
						<div className="glass-card-cap" />
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
							<CardTitle className="text-sm font-medium sidebar-gradient-text">
								Violations
							</CardTitle>
							<AlertTriangle className="h-4 w-4 text-[#0f5384]" />
						</CardHeader>
						<CardContent className="bg-slate-50">
							<div className="text-2xl font-bold text-slate-700">
								{summary.violations.toLocaleString()}
							</div>
							<p className="text-xs text-slate-600 mt-1">Rate limit exceeded</p>
						</CardContent>
					</Card>

					<Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
						<div className="glass-card-cap" />
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
							<CardTitle className="text-sm font-medium sidebar-gradient-text">
								Efficiency
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-[#0f5384]" />
						</CardHeader>
						<CardContent className="bg-slate-50">
							<div className="text-2xl font-bold text-green-600">
								{summary.efficiency}
							</div>
							<p className="text-xs text-slate-600 mt-1">Requests allowed</p>
						</CardContent>
					</Card>

					<Card className="glass-card hover:shadow-drop-3 transition-all duration-300">
						<div className="glass-card-cap" />
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
							<CardTitle className="text-sm font-medium sidebar-gradient-text">
								Avg Latency
							</CardTitle>
							<Clock className="h-4 w-4 text-[#0f5384]" />
						</CardHeader>
						<CardContent className="bg-slate-50">
							<div className="text-2xl font-bold text-slate-700">
								{summary.averageLatency}
							</div>
							<p className="text-xs text-slate-600 mt-1">
								Rate limit check time
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Top Violators */}
				{topViolators.length > 0 && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center gap-3">
								<Users className="w-5 h-5 text-[#0f5384]" />
								<CardTitle className="text-xl font-semibold sidebar-gradient-text">
									Top Violators
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="bg-slate-50 p-6">
							<CaalmDataTable className="pb-0">
								<TableHeader className="[&_tr]:border-b-0">
									<TableRow className={DATA_TABLE_HEADER_ROW}>
										<TableHead
											className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}
										>
											Identifier
										</TableHead>
										<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
											Violations
										</TableHead>
										<TableHead
											className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}
										>
											Status
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="[&_tr:last-child>td]:border-b-0">
									{topViolators.map((violator, index) => (
										<TableRow key={index} className={DATA_TABLE_BODY_ROW_BASE}>
											<TableCell className="px-3 py-3 pl-4 pr-3 text-sm text-slate-700">
												{violator.identifier.length > 50
													? `${violator.identifier.substring(0, 50)}...`
													: violator.identifier}
											</TableCell>
											<TableCell className="px-3 py-3">
												<Badge variant="destructive">{violator.count}</Badge>
											</TableCell>
											<TableCell className="px-3 py-3 pl-3 pr-4">
												<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
													Active
												</span>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</CaalmDataTable>
						</CardContent>
					</Card>
				)}

				{/* Endpoint Statistics */}
				{Object.keys(endpointStats).length > 0 && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center gap-3">
								<Server className="w-5 h-5 text-[#0f5384]" />
								<CardTitle className="text-xl font-semibold sidebar-gradient-text">
									Endpoint Statistics
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="bg-slate-50 p-6">
							<div className="space-y-4">
								{Object.entries(endpointStats)
									.sort((a, b) => b[1].violations - a[1].violations)
									.slice(0, 20)
									.map(([endpoint, stats]) => (
										<div
											key={endpoint}
											className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-lg bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
										>
											<div className="flex-1">
												<p className="font-medium text-sm text-slate-700">
													{endpoint}
												</p>
												<p className="text-xs text-slate-600 mt-1">
													{stats.requests.toLocaleString()} requests
												</p>
											</div>
											<div className="flex items-center gap-4">
												<div className="text-right">
													<p className="text-sm font-semibold text-destructive">
														{stats.violations}
													</p>
													<p className="text-xs text-slate-600">violations</p>
												</div>
												<div className="text-right">
													<p className="text-sm font-semibold text-slate-700">
														{stats.requests > 0
															? (
																	(stats.violations / stats.requests) *
																	100
																).toFixed(1)
															: 0}
														%
													</p>
													<p className="text-xs text-slate-600">
														violation rate
													</p>
												</div>
											</div>
										</div>
									))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Empty State */}
				{!isLoading && summary.totalRequests === 0 && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="pt-6 bg-slate-50">
							<div className="text-center py-8">
								<Activity className="h-12 w-12 mx-auto text-slate-400 mb-4" />
								<h3 className="text-lg font-semibold mb-2 text-slate-700">
									No Rate Limit Data
								</h3>
								<p className="text-slate-600 mb-4">
									Rate limit metrics will appear here once API requests are
									made.
								</p>
								<Button
									onClick={refresh}
									variant="outline"
									className="primary-btn px-3 sm:px-4"
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Refresh
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Professional Footer */}
			<div className="glass-dialog-alert-footer">
				<div className="text-xs text-slate-500">
					Last updated:{" "}
					{metrics?.timestamp
						? new Date(metrics.timestamp).toLocaleString()
						: "Never"}
				</div>
				<div className="flex items-center gap-3">
					<Button
						onClick={refresh}
						variant="outline"
						size="sm"
						className="primary-btn px-3 sm:px-4"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>
			<ConfirmDialog
				open={resetOpen}
				onOpenChange={setResetOpen}
				variant="destructive"
				icon={<Trash2 className="h-5 w-5" />}
				title="Reset rate limit metrics?"
				description="This action cannot be undone."
				confirmLabel="Reset metrics"
				onConfirm={handleReset}
			/>
		</div>
	);
}

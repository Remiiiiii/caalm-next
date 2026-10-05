/**
 * IT Dashboard Component
 * Connectivity + process signals only — no invented host CPU graphs.
 */

"use client";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Building2,
	CheckCircle,
	Server,
	Wifi,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import {
	DashboardGreeting,
	type DashboardGreetingUser,
} from "@/components/dashboard/DashboardGreeting";
import { ITHubOverviewCards } from "@/components/it/ITHubOverviewCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { SampleDataBadge } from "@/components/ui/sample-data-badge";
import { useITOrgScope } from "@/contexts/ITOrgScopeContext";
import { useITDashboard } from "@/hooks/useITDashboard";
import { useITMetrics } from "@/hooks/useITMetrics";
import { useITUser } from "@/hooks/useITUser";
import {
	type ConnectionStatus,
	realtimeService,
} from "@/lib/services/realtime-service";

type ITDashboardProps = {
	user?: DashboardGreetingUser | null;
};

function formatNullableStat(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return "—";
	return value.toLocaleString();
}

const ITDashboard: React.FC<ITDashboardProps> = ({ user }) => {
	const {
		dashboard,
		isLoading: dashboardLoading,
		error: dashboardError,
	} = useITDashboard({
		enableRealTime: true,
		pollingInterval: 30000,
	});

	// SSE stays subscribed so we know when host telemetry is absent (configured: false).
	const { metrics, loading: metricsLoading } = useITMetrics({
		enabled: true,
	});

	const { user: itUser, loading: userLoading } = useITUser();
	const { hubOrgId, canViewFleet } = useITOrgScope();
	// Platform home only: Appwrite/process checks are not tenant data.
	const showPlatformProbes = canViewFleet && !hubOrgId;
	const greetingUser = (user ?? itUser ?? null) as DashboardGreetingUser | null;
	const [realtimeStatus, setRealtimeStatus] = React.useState<ConnectionStatus>(
		realtimeService.getConnectionStatus(),
	);

	React.useEffect(() => {
		const unsubscribe = realtimeService.onStatusChange((status) => {
			setRealtimeStatus(status);
		});
		setRealtimeStatus(realtimeService.getConnectionStatus());
		return unsubscribe;
	}, []);

	const _isLoading = dashboardLoading || metricsLoading || userLoading;

	const systemHealth = dashboard?.systemHealth;
	const healthStatus = systemHealth?.status;
	const quickStats = dashboard?.quickStats;
	const notice =
		dashboard?.notice ||
		(!dashboardLoading && !dashboard?.telemetryConfigured
			? "Host telemetry is not configured."
			: null);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="space-y-6">
				<DashboardGreeting
					user={greetingUser}
					actions={
						<div className="flex items-center gap-2">
							{realtimeStatus === "connected" ? (
								<div className="flex items-center gap-1 text-green-600">
									<Wifi className="h-4 w-4" />
									<span className="text-sm">Real-time sync active</span>
								</div>
							) : (
								<div className="flex items-center gap-1 text-yellow-600">
									<Wifi className="h-4 w-4" />
									<span className="text-sm">Connecting…</span>
								</div>
							)}
						</div>
					}
				/>

				{canViewFleet && !hubOrgId ? (
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
						<p className="text-sm text-slate-600 max-w-3xl">
							Select a tenant to inspect org-scoped seats, storage, tickets, and
							audit activity. Platform connectivity stays below.
						</p>
						<Button className="btn-primary px-3 sm:px-4" asChild>
							<Link href="/dashboard/it/tenants">
								<Building2 className="h-4 w-4" />
								Open tenant fleet
							</Link>
						</Button>
					</div>
				) : null}

				{hubOrgId ? <ITHubOverviewCards orgId={hubOrgId} /> : null}

				{showPlatformProbes && notice ? (
					<div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
						<p className="text-sm text-slate-600 max-w-3xl">{notice}</p>
						<SampleDataBadge label="Not configured" />
					</div>
				) : null}

				{showPlatformProbes && dashboardError ? (
					<div className="rounded-lg border border-red/20 bg-red/10 px-4 py-3 text-sm text-red">
						{dashboardError}
					</div>
				) : null}

				{showPlatformProbes ? (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
						<MetricStatCard
							title="System Status"
							value={<span className="capitalize">{healthStatus ?? "—"}</span>}
							description={
								systemHealth?.uptime != null
									? `Uptime: ${systemHealth.uptime}%`
									: "Connectivity checks only"
							}
							icon={Server}
							iconTone={
								healthStatus === "healthy"
									? "success"
									: healthStatus === "degraded"
										? "warning"
										: healthStatus === "down"
											? "danger"
											: "default"
							}
							dynamicIcon={
								healthStatus === "healthy"
									? CheckCircle
									: healthStatus === "degraded"
										? AlertTriangle
										: healthStatus === "down"
											? XCircle
											: undefined
							}
							dynamicTone={
								healthStatus === "healthy"
									? "success"
									: healthStatus === "degraded"
										? "warning"
										: "danger"
							}
							valueTone={
								healthStatus === "healthy"
									? "success"
									: healthStatus === "degraded"
										? "warning"
										: healthStatus === "down"
											? "danger"
											: "default"
							}
						/>
						<MetricStatCard
							title="API Requests"
							value={formatNullableStat(quickStats?.apiRequests)}
							description="Requires request telemetry"
							icon={Activity}
						/>
						<MetricStatCard
							title="Process heap"
							value={
								quickStats?.processHeapUsedMb != null
									? `${quickStats.processHeapUsedMb} MB`
									: "—"
							}
							description={
								quickStats?.processUptimeLabel
									? `Uptime ${quickStats.processUptimeLabel}`
									: "This Next.js process (not host RAM)"
							}
							icon={Server}
						/>
						<MetricStatCard
							title="Active Incidents"
							value={formatNullableStat(quickStats?.activeIncidents)}
							description="Requires incident tooling"
							icon={AlertCircle}
						/>
					</div>
				) : null}

				{showPlatformProbes && systemHealth?.services?.length ? (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center gap-3">
								<Server className="w-5 h-5 text-[#0f5384]" />
								<CardTitle className="text-xl font-semibold sidebar-gradient-text">
									Service checks
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="bg-slate-50 p-6">
							<ul className="space-y-3">
								{systemHealth.services.map((service) => (
									<li
										key={service.name}
										className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3"
									>
										<div>
											<p className="text-sm font-medium text-slate-700">
												{service.name}
											</p>
											<p className="text-xs text-slate-500">
												{service.detail ||
													(service.responseTime != null
														? `${service.responseTime} ms`
														: "—")}
											</p>
										</div>
										{service.status === "up" ? (
											<CheckCircle className="h-5 w-5 text-green" />
										) : (
											<XCircle className="h-5 w-5 text-red" />
										)}
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				) : null}

				{/* Host performance graphs only when a real SSE payload is configured */}
				{showPlatformProbes &&
				metrics?.systemPerformance &&
				metrics.configured !== false ? (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center justify-between gap-3">
								<CardTitle className="text-xl font-semibold sidebar-gradient-text">
									System Performance
								</CardTitle>
								<SampleDataBadge />
							</div>
						</CardHeader>
						<CardContent className="bg-slate-50 p-6">
							<p className="text-sm text-slate-600">
								Live host graphs appear here when an observability backend is
								wired.
							</p>
						</CardContent>
					</Card>
				) : null}

				{showPlatformProbes && !dashboardLoading && !dashboard && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="pt-6 bg-slate-50">
							<div className="text-center py-8">
								<Server className="h-12 w-12 mx-auto text-slate-400 mb-4" />
								<h3 className="text-lg font-semibold mb-2 text-slate-700">
									No dashboard data
								</h3>
								<p className="text-slate-600 mb-4">
									Unable to load connectivity checks. Retry or verify IT access.
								</p>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
};

export default ITDashboard;

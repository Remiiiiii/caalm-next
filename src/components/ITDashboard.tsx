/**
 * IT Dashboard Component
 * Main dashboard with overview widgets, system health, and real-time metrics
 */

"use client";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	Server,
	TrendingUp,
	Wifi,
	XCircle,
} from "lucide-react";
import React from "react";
import {
	DashboardGreeting,
	type DashboardGreetingUser,
} from "@/components/dashboard/DashboardGreeting";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { useITDashboard } from "@/hooks/useITDashboard";
import { useITMetrics } from "@/hooks/useITMetrics";
import { useITUser } from "@/hooks/useITUser";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import {
	type ConnectionStatus,
	realtimeService,
} from "@/lib/services/realtime-service";
import { formatInTimezone } from "@/lib/timezone";

type ITDashboardProps = {
	user?: DashboardGreetingUser | null;
};

const ITDashboard: React.FC<ITDashboardProps> = ({ user }) => {
	const timeZone = useOrgTimezone();
	const {
		dashboard,
		isLoading: dashboardLoading,
		error: dashboardError,
	} = useITDashboard({
		enableRealTime: true,
		pollingInterval: 30000,
	});

	const {
		metrics,
		loading: metricsLoading,
		connectionStatus,
	} = useITMetrics({
		enabled: true,
	});

	const { user: itUser, loading: userLoading } = useITUser();
	const greetingUser = (user ?? itUser ?? null) as DashboardGreetingUser | null;
	const [realtimeStatus, setRealtimeStatus] = React.useState<ConnectionStatus>(
		realtimeService.getConnectionStatus(),
	);

	// Subscribe to real-time connection status
	React.useEffect(() => {
		const unsubscribe = realtimeService.onStatusChange((status) => {
			setRealtimeStatus(status);
		});
		setRealtimeStatus(realtimeService.getConnectionStatus());
		return unsubscribe;
	}, []);

	// Don't early return - render loading state inline to maintain consistent hook calls
	const _isLoading = dashboardLoading || metricsLoading || userLoading;

	const systemHealth = dashboard?.systemHealth;
	const healthStatus = systemHealth?.status;

	const quickStats = dashboard?.quickStats || {
		apiRequests: metrics?.apiRequests?.total || 0,
		deployments: metrics?.deployments?.total || 0,
		activeIncidents: metrics?.incidents?.active || 0,
		systemLoad: 0,
	};

	const recentAlerts = dashboard?.recentAlerts || [];

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

				{/* System Health Cards */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					<MetricStatCard
						title="System Status"
						value={
							<span className="capitalize">{healthStatus ?? "—"}</span>
						}
						description={
							systemHealth
								? `Uptime: ${systemHealth.uptime}%`
								: "Waiting on live status"
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
						value={
							typeof quickStats.apiRequests === "number"
								? quickStats.apiRequests.toLocaleString()
								: "0"
						}
						description="Total requests"
						icon={Activity}
					/>
					<MetricStatCard
						title="Deployments"
						value={
							typeof quickStats.deployments === "number"
								? quickStats.deployments.toLocaleString()
								: "0"
						}
						description="Total deployments"
						icon={Server}
					/>
					<MetricStatCard
						title="Active Incidents"
						value={
							typeof quickStats.activeIncidents === "number"
								? quickStats.activeIncidents
								: "0"
						}
						description="Requiring attention"
						icon={AlertCircle}
						iconTone={
							Number(quickStats.activeIncidents) > 0 ? "danger" : "default"
						}
						dynamicIcon={
							Number(quickStats.activeIncidents) > 0
								? AlertTriangle
								: undefined
						}
						dynamicTone="danger"
						valueTone={
							Number(quickStats.activeIncidents) > 0 ? "danger" : "default"
						}
					/>
				</div>

				{/* System Performance Metrics */}
				{metrics?.systemPerformance && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center gap-3">
								<TrendingUp className="w-5 h-5 text-[#0f5384]" />
								<CardTitle className="text-xl font-semibold sidebar-gradient-text">
									System Performance
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="bg-slate-50 p-6">
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
								<div className="p-4 bg-white rounded-lg border border-slate-200">
									<p className="text-sm text-slate-600 mb-1">CPU Usage</p>
									<p className="text-2xl font-bold text-slate-700">
										{metrics.systemPerformance.cpuUsage.toFixed(1)}%
									</p>
								</div>
								<div className="p-4 bg-white rounded-lg border border-slate-200">
									<p className="text-sm text-slate-600 mb-1">Memory Usage</p>
									<p className="text-2xl font-bold text-slate-700">
										{metrics.systemPerformance.memoryUsage.toFixed(1)}%
									</p>
								</div>
								<div className="p-4 bg-white rounded-lg border border-slate-200">
									<p className="text-sm text-slate-600 mb-1">Disk I/O</p>
									<p className="text-2xl font-bold text-slate-700">
										{metrics.systemPerformance.diskIO.toFixed(1)}%
									</p>
								</div>
								<div className="p-4 bg-white rounded-lg border border-slate-200">
									<p className="text-sm text-slate-600 mb-1">Network Traffic</p>
									<p className="text-2xl font-bold text-slate-700">
										{metrics.systemPerformance.networkTraffic.toFixed(1)} MB/s
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Recent Alerts */}
				{recentAlerts.length > 0 && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardHeader className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center gap-3">
								<AlertTriangle className="w-5 h-5 text-[#0f5384]" />
								<CardTitle className="text-xl font-semibold sidebar-gradient-text">
									Recent Alerts
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="bg-slate-50 p-6">
							<div className="space-y-2">
								{recentAlerts.slice(0, 5).map((alert) => (
									<div
										key={alert.id}
										className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
									>
										<div className="flex items-center gap-3">
											{alert.severity === "critical" && (
												<XCircle className="h-5 w-5 text-red-600" />
											)}
											{alert.severity === "warning" && (
												<AlertTriangle className="h-5 w-5 text-yellow-600" />
											)}
											{alert.severity === "info" && (
												<AlertCircle className="h-5 w-5 text-blue-600" />
											)}
											<div>
												<p className="text-sm font-medium text-slate-700">
													{alert.message}
												</p>
												<p className="text-xs text-slate-600">
													{formatInTimezone(
														new Date(alert.timestamp),
														"MMM d, yyyy h:mm a",
														timeZone,
													)}
												</p>
											</div>
										</div>
										<Badge
											variant={
												alert.severity === "critical"
													? "destructive"
													: alert.severity === "warning"
														? "default"
														: "secondary"
											}
										>
											{alert.severity}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Empty State */}
				{!dashboardLoading && !dashboard && !metrics && (
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="pt-6 bg-slate-50">
							<div className="text-center py-8">
								<Server className="h-12 w-12 mx-auto text-slate-400 mb-4" />
								<h3 className="text-lg font-semibold mb-2 text-slate-700">
									No Dashboard Data
								</h3>
								<p className="text-slate-600 mb-4">
									Dashboard metrics will appear here once system data is
									available.
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

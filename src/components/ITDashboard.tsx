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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useITDashboard } from "@/hooks/useITDashboard";
import { useITMetrics } from "@/hooks/useITMetrics";
import { useITUser } from "@/hooks/useITUser";
import {
	type ConnectionStatus,
	realtimeService,
} from "@/lib/services/realtime-service";

type ITDashboardProps = {};

const ITDashboard: React.FC<ITDashboardProps> = () => {
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

	const systemHealth = dashboard?.systemHealth || {
		status: "healthy" as const,
		uptime: 99.9,
		services: [],
	};

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
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight sidebar-gradient-text">
							IT Dashboard
						</h2>
						<p className="text-muted-foreground">
							System overview and real-time monitoring
						</p>
					</div>
					<div className="flex items-center gap-2">
						{realtimeStatus === "connected" ? (
							<div className="flex items-center gap-1 text-green-600">
								<Wifi className="h-4 w-4" />
								<span className="text-sm">Real-time sync active</span>
							</div>
						) : (
							<div className="flex items-center gap-1 text-yellow-600">
								<Wifi className="h-4 w-4 animate-pulse" />
								<span className="text-sm">Connecting...</span>
							</div>
						)}
					</div>
				</div>

				{/* System Health Cards */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										System Status
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 capitalize">
										<span>{systemHealth.status}</span>
										<span className="inline-block ml-2 pb-1">
											{systemHealth.status === "healthy" ? (
												<CheckCircle className="h-8 w-8 text-green-600" />
											) : systemHealth.status === "degraded" ? (
												<AlertTriangle className="h-8 w-8 text-yellow-600" />
											) : (
												<XCircle className="h-8 w-8 text-red-600" />
											)}
										</span>
									</div>
									<p className="text-xs text-slate-600 mt-1">
										Uptime: {systemHealth.uptime}%
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										API Requests
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>
											{typeof quickStats.apiRequests === "number"
												? quickStats.apiRequests.toLocaleString()
												: "0"}
										</span>
										<span className="inline-block ml-2 pb-1">
											<Activity className="h-8 w-8 text-slate-600" />
										</span>
									</div>
									<p className="text-xs text-slate-600 mt-1">Total requests</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										Deployments
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>
											{typeof quickStats.deployments === "number"
												? quickStats.deployments.toLocaleString()
												: "0"}
										</span>
										<span className="inline-block ml-2 pb-1">
											<Server className="h-8 w-8 text-slate-600" />
										</span>
									</div>
									<p className="text-xs text-slate-600 mt-1">
										Total deployments
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										Active Incidents
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>
											{typeof quickStats.activeIncidents === "number"
												? quickStats.activeIncidents
												: "0"}
										</span>
										<span className="inline-block ml-2 pb-1">
											<AlertCircle className="h-8 w-8 text-slate-600" />
										</span>
									</div>
									<p className="text-xs text-slate-600 mt-1">
										Requiring attention
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
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
													{new Date(alert.timestamp).toLocaleString()}
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

/**
 * Storage Metrics Page — local disk scan of this app host (honest empty when absent).
 */

"use client";

import { FileText, HardDrive, Package, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { SampleDataBadge } from "@/components/ui/sample-data-badge";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";

interface StorageMetrics {
	configured?: boolean;
	source?: string;
	notice?: string;
	sourceCode: { size: number; unit: string };
	dependencies: { size: number; unit: string };
	buildArtifacts: { size: number; unit: string };
	publicAssets: { size: number; unit: string };
	lockFile: { size: number; unit: string };
	total: { size: number; unit: string };
	componentBreakdown: Array<{
		name: string;
		size: number;
		percentage: number;
	}>;
}

const COLORS = [
	"#3B82F6",
	"#10B981",
	"#F59E0B",
	"#8B5CF6",
	"#EF4444",
	"#06B6D4",
];

export default function StorageMetricsPage() {
	const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [unavailableNotice, setUnavailableNotice] = useState<string | null>(
		null,
	);

	const fetchStorageMetrics = useCallback(async () => {
		try {
			const response = await fetch("/api/it/storage-metrics");
			const data = await response.json().catch(() => null);
			if (response.ok && data?.configured !== false) {
				setMetrics(data);
				setUnavailableNotice(null);
			} else {
				setMetrics(null);
				setUnavailableNotice(
					data?.notice ||
						"Not configured — local disk scan is unavailable on this host.",
				);
			}
		} catch {
			setMetrics(null);
			setUnavailableNotice(
				"Not configured — could not reach IT storage metrics.",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchStorageMetrics();
	}, [fetchStorageMetrics]);

	if (loading) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
				<div className="glass-card w-full overflow-hidden">
					<div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[200px]">
						<LoadingSpinner size="md" label="Loading storage metrics..." />
					</div>
				</div>
			</div>
		);
	}

	if (!metrics) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
				<div className="glass-card w-full overflow-hidden">
					<div className="glass-card-cap" />
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center justify-between gap-3 px-6">
							<div className="flex items-center gap-3">
								<HardDrive className="w-6 h-6 text-[#0f5384]" />
								<h2 className="text-xl font-semibold sidebar-gradient-text">
									Storage Metrics
								</h2>
							</div>
							<SampleDataBadge label="Not configured" />
						</div>
					</div>
					<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-3">
						<p className="text-slate-700 font-medium">Not configured</p>
						<p className="text-sm text-slate-600">
							{unavailableNotice ||
								"Local project disk sizes are not available here. Appwrite file storage for org uploads is separate (Storage API usage)."}
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
			<div className="glass-card w-full overflow-hidden">
				<div className="glass-card-cap" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center justify-between gap-3 px-6 flex-wrap">
						<div className="flex items-center gap-3">
							<HardDrive className="w-6 h-6 text-[#0f5384]" />
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Storage Metrics
							</h2>
						</div>
					</div>
					{metrics.notice ? (
						<p className="text-sm text-slate-600 mt-1 px-6 pb-3">{metrics.notice}</p>
					) : null}
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Total Storage
								</CardTitle>
								<Server className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{metrics.total.size} {metrics.total.unit}
								</div>
								<p className="text-xs text-muted-foreground">
									This host disk scan
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Source Code
								</CardTitle>
								<FileText className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{metrics.sourceCode.size} {metrics.sourceCode.unit}
								</div>
								<p className="text-xs text-muted-foreground">
									src, tests, public, lockfile
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Dependencies
								</CardTitle>
								<Package className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{metrics.dependencies.size} {metrics.dependencies.unit}
								</div>
								<p className="text-xs text-muted-foreground">
									node_modules directory
								</p>
							</CardContent>
						</Card>
					</div>

					{metrics.componentBreakdown.length > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle>Storage Breakdown by Component</CardTitle>
								<CardDescription>
									Measured on this host — not cross-OS estimates
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<PieChart>
										<Pie
											data={metrics.componentBreakdown}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={(entry: { name?: string; percentage?: number }) =>
												`${entry.name}: ${entry.percentage}%`
											}
											outerRadius={100}
											fill="#8884d8"
											dataKey="size"
										>
											{metrics.componentBreakdown.map((_entry, index) => (
												<Cell
													key={`cell-${_entry.name}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					) : null}

					<Card>
						<CardHeader>
							<CardTitle>Storage Components</CardTitle>
							<CardDescription>
								Detailed breakdown of storage usage
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm">Source Code (src/ + tests + public)</span>
									<Badge variant="outline">
										{metrics.sourceCode.size} {metrics.sourceCode.unit}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm">Dependencies (node_modules)</span>
									<Badge variant="outline">
										{metrics.dependencies.size} {metrics.dependencies.unit}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm">Build Artifacts (.next)</span>
									<Badge variant="outline">
										{metrics.buildArtifacts.size} {metrics.buildArtifacts.unit}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm">Lock File</span>
									<Badge variant="outline">
										{metrics.lockFile.size} {metrics.lockFile.unit}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

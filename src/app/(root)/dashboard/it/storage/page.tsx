/**
 * Storage Metrics Page
 * Displays detailed storage information about the application
 */

"use client";

import { FileText, HardDrive, Package, Server } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
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
	sourceCode: { size: number; unit: string };
	dependencies: { size: number; unit: string };
	buildArtifacts: { size: number; unit: string };
	publicAssets: { size: number; unit: string };
	lockFile: { size: number; unit: string };
	total: { size: number; unit: string };
	platformBreakdown: Array<{
		platform: string;
		nodeModules: number;
		buildArtifacts: number;
		total: number;
	}>;
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

	const fetchStorageMetrics = async () => {
		try {
			const response = await fetch("/api/it/storage-metrics");
			if (response.ok) {
				const data = await response.json();
				setMetrics(data);
			} else {
				// Fallback to mock data if API fails
				setMetrics(getMockMetrics());
			}
		} catch (error) {
			console.error("Failed to fetch storage metrics:", error);
			setMetrics(getMockMetrics());
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStorageMetrics();
	}, [fetchStorageMetrics]);

	const getMockMetrics = (): StorageMetrics => {
		return {
			sourceCode: { size: 12, unit: "MB" },
			dependencies: { size: 350, unit: "MB" },
			buildArtifacts: { size: 120, unit: "MB" },
			publicAssets: { size: 15, unit: "MB" },
			lockFile: { size: 3, unit: "MB" },
			total: { size: 500, unit: "MB" },
			platformBreakdown: [
				{
					platform: "Windows",
					nodeModules: 380,
					buildArtifacts: 130,
					total: 510,
				},
				{
					platform: "Linux",
					nodeModules: 320,
					buildArtifacts: 110,
					total: 430,
				},
				{
					platform: "macOS",
					nodeModules: 340,
					buildArtifacts: 115,
					total: 455,
				},
			],
			componentBreakdown: [
				{ name: "node_modules", size: 350, percentage: 70 },
				{ name: ".next", size: 120, percentage: 24 },
				{ name: "src/", size: 8, percentage: 1.6 },
				{ name: "public/", size: 15, percentage: 3 },
				{ name: "tests/", size: 2, percentage: 0.4 },
				{ name: "Other", size: 5, percentage: 1 },
			],
		};
	};

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
					<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
						<p className="text-slate-600">Failed to load storage metrics.</p>
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
					<div className="flex items-center gap-3 px-6">
						<HardDrive className="w-6 h-6 text-blue-600" />
						<h2 className="text-xl font-semibold sidebar-gradient-text">
							Storage Metrics
						</h2>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
					{/* Overview Cards */}
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
									Complete application size
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
								<p className="text-xs text-muted-foreground">Tracked by Git</p>
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

					{/* Component Breakdown Pie Chart */}
					<Card>
						<CardHeader>
							<CardTitle>Storage Breakdown by Component</CardTitle>
							<CardDescription>
								Distribution of storage across different application components
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
										label={(entry: any) =>
											`${entry.name}: ${entry.percentage}%`
										}
										outerRadius={100}
										fill="#8884d8"
										dataKey="size"
									>
										{metrics.componentBreakdown.map((_entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={COLORS[index % COLORS.length]}
											/>
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* Platform Comparison Bar Chart */}
					<Card>
						<CardHeader>
							<CardTitle>Storage Size by Platform</CardTitle>
							<CardDescription>
								How storage size differs across different operating systems
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={metrics.platformBreakdown}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="platform" />
									<YAxis
										label={{
											value: "Size (MB)",
											angle: -90,
											position: "insideLeft",
										}}
									/>
									<Tooltip />
									<Legend />
									<Bar
										dataKey="nodeModules"
										fill="#3B82F6"
										name="node_modules"
									/>
									<Bar
										dataKey="buildArtifacts"
										fill="#10B981"
										name="Build Artifacts"
									/>
									<Bar dataKey="total" fill="#F59E0B" name="Total" />
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* Detailed Information */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
										<div className="flex items-center gap-2">
											<div className="w-3 h-3 rounded-full bg-blue-500" />
											<span className="text-sm">Source Code (src/)</span>
										</div>
										<Badge variant="outline">
											{metrics.sourceCode.size} {metrics.sourceCode.unit}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-3 h-3 rounded-full bg-green-500" />
											<span className="text-sm">
												Dependencies (node_modules)
											</span>
										</div>
										<Badge variant="outline">
											{metrics.dependencies.size} {metrics.dependencies.unit}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-3 h-3 rounded-full bg-yellow-500" />
											<span className="text-sm">Build Artifacts (.next)</span>
										</div>
										<Badge variant="outline">
											{metrics.buildArtifacts.size}{" "}
											{metrics.buildArtifacts.unit}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-3 h-3 rounded-full bg-purple-500" />
											<span className="text-sm">Public Assets</span>
										</div>
										<Badge variant="outline">
											{metrics.publicAssets.size} {metrics.publicAssets.unit}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<div className="w-3 h-3 rounded-full bg-cyan-500" />
											<span className="text-sm">Lock File</span>
										</div>
										<Badge variant="outline">
											{metrics.lockFile.size} {metrics.lockFile.unit}
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Platform Differences</CardTitle>
								<CardDescription>
									Why storage size varies across devices
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3 text-sm">
									<div>
										<p className="font-semibold mb-1">
											Platform-Specific Binaries
										</p>
										<p className="text-muted-foreground">
											Native modules (esbuild, sharp, canvas) have different
											binaries for Windows, Linux, and macOS, causing size
											variations of 50-100 MB.
										</p>
									</div>
									<div>
										<p className="font-semibold mb-1">Build Artifacts</p>
										<p className="text-muted-foreground">
											The .next directory is generated during build and can vary
											based on optimization settings and environment.
										</p>
									</div>
									<div>
										<p className="font-semibold mb-1">Cache Directories</p>
										<p className="text-muted-foreground">
											.pnpm-store and .next/cache can add 100-300 MB depending
											on usage patterns.
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Summary */}
					<Card>
						<CardHeader>
							<CardTitle>Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 text-sm">
								<p>
									<strong>Source Code Only (Git Repo):</strong> ~
									{metrics.sourceCode.size} {metrics.sourceCode.unit} - This is
									consistent across all devices as it only includes tracked
									source files.
								</p>
								<p>
									<strong>With Dependencies:</strong> ~
									{metrics.dependencies.size} {metrics.dependencies.unit} - The
									node_modules directory contains platform-specific binaries
									that differ between Windows, Linux, and macOS.
								</p>
								<p>
									<strong>With Build Artifacts:</strong> ~{metrics.total.size}{" "}
									{metrics.total.unit} - Complete application size including all
									dependencies and build outputs. Actual size may vary by 50-150
									MB depending on the platform and build configuration.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

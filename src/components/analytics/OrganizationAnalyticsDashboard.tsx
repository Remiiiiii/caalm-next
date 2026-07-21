"use client";

import {
	Activity,
	AlertTriangle,
	BarChart3,
	Building,
	ClipboardCheck,
	Download,
	Eye,
	FileText,
	Shield,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentComplianceCard } from "./AnalyticsReadinessOverview";
interface ContractStats {
	totalContracts: number;
	totalBudget: number;
	activeContracts: number;
	expiredContracts: number;
	pendingContracts: number;
	complianceRate: number;
	staffCount: number;
}

interface DepartmentAnalytics {
	name: string;
	divisions: {
		id: string;
		name: string;
		description: string;
		stats: ContractStats;
	}[];
	totalStats: ContractStats;
}

interface OrganizationAnalyticsData {
	departments: DepartmentAnalytics[];
	totalStats: {
		totalContracts: number;
		totalBudget: number;
		totalActiveStaff: number;
		complianceRate: number;
	};
}

// Mock data for charts
const mockData = {
	contractTrends: [
		{ month: "Jan", active: 45, pending: 12, expired: 3 },
		{ month: "Feb", active: 52, pending: 15, expired: 5 },
		{ month: "Mar", active: 48, pending: 18, expired: 7 },
		{ month: "Apr", active: 61, pending: 22, expired: 4 },
		{ month: "May", active: 58, pending: 19, expired: 6 },
		{ month: "Jun", active: 67, pending: 25, expired: 8 },
	],
	budgetAllocation: [
		{ department: "Child Welfare", budget: 450000, spent: 380000 },
		{ department: "Behavioral Health", budget: 320000, spent: 295000 },
		{ department: "CINS/FINS/SNAP", budget: 280000, spent: 265000 },
		{ department: "Residential", budget: 380000, spent: 345000 },
		{ department: "Clinic", budget: 290000, spent: 275000 },
		{ department: "Administration", budget: 180000, spent: 165000 },
	],
	licenseCompliance: [
		{ status: "Compliant", count: 85, color: "#03AFBF" },
		{ status: "At Risk", count: 12, color: "#F59E0B" },
		{ status: "Non-Compliant", count: 8, color: "#EF4444" },
		{ status: "Pending Review", count: 15, color: "#524E4E" },
	],
	monthlyExpenses: [
		{ month: "Jan", expenses: 125000 },
		{ month: "Feb", expenses: 138000 },
		{ month: "Mar", expenses: 142000 },
		{ month: "Apr", expenses: 156000 },
		{ month: "May", expenses: 149000 },
		{ month: "Jun", expenses: 162000 },
	],
	staffDistribution: [
		{ role: "Executives", count: 8 },
		{ role: "Managers", count: 24 },
		{ role: "Administrators", count: 15 },
		{ role: "Support Staff", count: 42 },
	],
	contractTypes: [
		{ type: "Service Contracts", count: 35, color: "#3B82F6" },
		{ type: "Vendor Agreements", count: 28, color: "#10B981" },
		{ type: "Partnerships", count: 18, color: "#F59E0B" },
		{ type: "Consulting", count: 12, color: "#8B5CF6" },
		{ type: "Equipment", count: 8, color: "#EF4444" },
	],
};

const OrganizationAnalyticsDashboard = () => {
	const [selectedDepartmentTab, setSelectedDepartmentTab] =
		useState<string>("");
	const detailRef = useRef<HTMLDivElement>(null);

	// Use SWR for lightning-fast cached responses
	const { data, error, isLoading } = useSWR<{
		success: boolean;
		data: OrganizationAnalyticsData;
	}>(
		"/api/analytics/organization",
		async (url) => {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch organization analytics: ${response.statusText}`,
				);
			}
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || "Failed to fetch analytics data");
			}
			return result;
		},
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			dedupingInterval: 30000, // Dedupe requests within 30 seconds
			refreshInterval: 300000, // Refresh every 5 minutes
			errorRetryCount: 3,
			errorRetryInterval: 5000,
			keepPreviousData: true, // Keep previous data while fetching new data
		},
	);

	const analyticsData = data?.data || null;

	useEffect(() => {
		if (!analyticsData?.departments?.length) return;
		const first = analyticsData.departments[0].name.toLowerCase();
		const stillValid = analyticsData.departments.some(
			(d) => d.name.toLowerCase() === selectedDepartmentTab,
		);
		if (!selectedDepartmentTab || !stillValid) {
			setSelectedDepartmentTab(first);
		}
	}, [analyticsData, selectedDepartmentTab]);

	const handleExport = () => {
		if (!analyticsData?.departments?.length) return;

		const escapeCsv = (value: string | number) => {
			const str = String(value);
			if (str.includes(",") || str.includes('"') || str.includes("\n")) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		const headers = [
			"Department",
			"Contracts",
			"Staff",
			"Budget",
			"Compliance %",
			"Divisions",
		];
		const rows = analyticsData.departments.map((dept) => [
			dept.name,
			dept.totalStats.totalContracts,
			dept.totalStats.staffCount,
			dept.totalStats.totalBudget,
			dept.totalStats.complianceRate,
			dept.divisions.map((d) => d.name).join("; "),
		]);

		const csv = [headers, ...rows]
			.map((row) => row.map(escapeCsv).join(","))
			.join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `department-performance-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handleView = () => {
		detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	// Get department-specific data for charts
	const getDepartmentData = (deptName: string) => {
		if (!analyticsData || deptName === "all") {
			if (analyticsData) {
				const budgetData = analyticsData.departments.map((dept) => ({
					department: dept.name,
					budget: dept.totalStats.totalBudget,
					spent: Math.round(dept.totalStats.totalBudget * 0.85),
				}));

				const totalContracts = analyticsData.totalStats.totalContracts;
				const complianceRate = analyticsData.totalStats.complianceRate;

				const complianceData = [
					{
						status: "Compliant",
						count: Math.round(totalContracts * (complianceRate / 100)),
						color: "#03AFBF",
					},
					{
						status: "At Risk",
						count: Math.round(totalContracts * 0.1),
						color: "#F59E0B",
					},
					{
						status: "Non-Compliant",
						count: Math.max(
							0,
							totalContracts -
								Math.round(totalContracts * (complianceRate / 100)) -
								Math.round(totalContracts * 0.1),
						),
						color: "#EF4444",
					},
				].filter((item) => item.count > 0);

				const staffData = analyticsData.departments.map((dept) => ({
					role: dept.name,
					count: dept.totalStats.staffCount,
				}));

				const contractTypesData = analyticsData.departments
					.filter((d) => d.totalStats.totalContracts > 0)
					.map((dept, index) => ({
						type: dept.name,
						count: dept.totalStats.totalContracts,
						color: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"][
							index % 5
						],
					}));

				const scale = totalContracts / 67 || 1;
				const trendsData = mockData.contractTrends.map((item) => ({
					...item,
					active: Math.round(item.active * scale * (complianceRate / 100)),
					pending: Math.round(item.pending * scale * 0.3),
					expired: Math.round(item.expired * scale * 0.1),
				}));

				return {
					budgetData,
					expensesData: mockData.monthlyExpenses.map((item) => ({
						...item,
						expenses: Math.round(
							item.expenses * (analyticsData.totalStats.totalBudget / 2000000),
						),
					})),
					staffData,
					contractTypesData,
					complianceData,
					trendsData,
				};
			}

			return {
				budgetData: mockData.budgetAllocation,
				expensesData: mockData.monthlyExpenses,
				staffData: mockData.staffDistribution,
				contractTypesData: mockData.contractTypes,
				complianceData: mockData.licenseCompliance,
				trendsData: mockData.contractTrends,
			};
		}

		const dept = analyticsData.departments.find(
			(d) => d.name.toLowerCase() === deptName,
		);
		if (!dept) {
			return {
				budgetData: [],
				expensesData: [],
				staffData: [],
				contractTypesData: [],
				complianceData: [],
				trendsData: [],
			};
		}

		// Create department-specific data
		const budgetData =
			dept.divisions.length > 0
				? dept.divisions.map((div) => ({
						department: div.name,
						budget: div.stats.totalBudget,
						spent: div.stats.totalBudget * 0.85, // Mock 85% spent
					}))
				: [
						{
							department: dept.name,
							budget: dept.totalStats.totalBudget,
							spent: dept.totalStats.totalBudget * 0.85,
						},
					];

		const expensesData = mockData.monthlyExpenses.map((item) => ({
			...item,
			expenses: Math.round(
				item.expenses * (dept.totalStats.totalBudget / 2000000),
			), // Scale based on department budget
		}));

		const staffData =
			dept.divisions.length > 0
				? dept.divisions.map((div) => ({
						role: div.name,
						count: div.stats.staffCount,
					}))
				: [{ role: `${dept.name} Staff`, count: dept.totalStats.staffCount }];

		const contractTypesData = mockData.contractTypes.map((item, index) => ({
			...item,
			count: Math.max(
				1,
				Math.round(dept.totalStats.totalContracts * (0.4 - index * 0.08)),
			), // Distribute contracts
		}));

		const complianceData = [
			{
				status: "Compliant",
				count: Math.round(
					dept.totalStats.totalContracts *
						(dept.totalStats.complianceRate / 100),
				),
				color: "#03AFBF",
			},
			{
				status: "At Risk",
				count: Math.round(dept.totalStats.totalContracts * 0.1),
				color: "#F59E0B",
			},
			{
				status: "Non-Compliant",
				count: Math.round(
					dept.totalStats.totalContracts *
						((100 - dept.totalStats.complianceRate) / 100),
				),
				color: "#EF4444",
			},
		];

		const trendsData = mockData.contractTrends.map((item) => ({
			...item,
			active: Math.round(item.active * (dept.totalStats.activeContracts / 67)),
			pending: Math.round(
				item.pending * (dept.totalStats.pendingContracts / 25),
			),
			expired: Math.round(
				item.expired * (dept.totalStats.expiredContracts / 8),
			),
		}));

		return {
			budgetData,
			expensesData,
			staffData,
			contractTypesData,
			complianceData,
			trendsData,
		};
	};

	const currentDepartmentData = getDepartmentData(selectedDepartmentTab);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-center py-2">
					<LoadingSpinner
						size="sm"
						label="Loading analytics..."
						className="!p-0"
					/>
				</div>
				<div className="animate-pulse">
					<div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="h-32 bg-white/20 rounded-xl backdrop-blur"
							></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error || !analyticsData) {
		return (
			<div className="space-y-6">
				<div className="text-center py-12">
					<div className="flex items-center justify-center gap-2 text-red-600 mb-4">
						<AlertTriangle className="h-5 w-5" aria-hidden />
						<span>Error Loading Analytics</span>
					</div>
					<p className="text-red-700 mb-4">
						{error instanceof Error
							? error.message
							: typeof error === "string"
								? error
								: String(error) ||
									"Failed to load analytics data. Please try again later."}
					</p>
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-center">
				<div>
					<h1 className="h1 sidebar-gradient-text text-center">
						Organizational Performance Dashboard
					</h1>
					<p className="body-1 text-light-200 text-center py-2">
						Cross-departmental performance metrics and insights
					</p>
				</div>
			</div>

			{/* Department compliance — animated bars */}
			<DepartmentComplianceCard
				departments={analyticsData.departments.map((dept) => ({
					name: dept.name,
					complianceRate: dept.totalStats.complianceRate,
				}))}
			/>

			{/* Department Navigation */}
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<CardTitle className="h2 sidebar-gradient-text">
							Departmental Performance Breakdown
						</CardTitle>
						<div className="flex flex-wrap items-center gap-3">
							<Button
								onClick={handleExport}
								className="primary-btn px-3 sm:px-4"
							>
								<Download className="h-4 w-4" />
								Export
							</Button>
							<Button
								variant="outline"
								onClick={handleView}
								className="primary-btn px-3 sm:px-4"
							>
								<Eye className="h-4 w-4" />
								View
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{selectedDepartmentTab ? (
						<Tabs
							value={selectedDepartmentTab}
							className="w-full"
							onValueChange={(value) => setSelectedDepartmentTab(value)}
						>
							<TabsList className="flex h-auto w-full flex-wrap gap-1 bg-white/20 backdrop-blur border border-white/40 p-1">
								{analyticsData.departments.map((dept) => (
									<TabsTrigger
										key={dept.name}
										value={dept.name.toLowerCase()}
										className="flex-1 min-w-[4.5rem] data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
									>
										{dept.name}
									</TabsTrigger>
								))}
							</TabsList>

							{analyticsData.departments.map((dept) => (
								<TabsContent
									key={dept.name}
									value={dept.name.toLowerCase()}
									className="mt-6"
								>
									<div className="space-y-6">
										{/* Department Stats */}
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
											<Card className="glass-card">
												<div className="glass-card-cap" />
												<CardContent className="p-4">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm text-slate-600">
																Contracts
															</p>
															<p className="text-2xl font-bold text-navy">
																{dept.totalStats.totalContracts}
															</p>
														</div>
														<FileText
															className="h-8 w-8"
															style={{ color: "#524E4E" }}
														/>
													</div>
												</CardContent>
											</Card>
											<Card className="glass-card">
												<div className="glass-card-cap" />
												<CardContent className="p-4">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm text-slate-600">Budget</p>
															<p className="text-2xl font-bold text-navy">
																{(
																	dept.totalStats.totalBudget / 1000000
																).toFixed(1)}
																M
															</p>
														</div>
														<TrendingUp
															className="h-8 w-8"
															style={{ color: "#03AFBF" }}
														/>
													</div>
												</CardContent>
											</Card>
											<Card className="glass-card">
												<div className="glass-card-cap" />
												<CardContent className="p-4">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm text-slate-600">Staff</p>
															<p className="text-2xl font-bold text-navy">
																{dept.totalStats.staffCount}
															</p>
														</div>
														<Users
															className="h-8 w-8"
															style={{ color: "#56B8FF" }}
														/>
													</div>
												</CardContent>
											</Card>
											<Card className="glass-card">
												<div className="glass-card-cap" />
												<CardContent className="p-4">
													<div className="flex items-center justify-between">
														<div>
															<p className="text-sm text-slate-600">
																Compliance
															</p>
															<p className="text-2xl font-bold text-navy">
																{dept.totalStats.complianceRate}%
															</p>
														</div>
														<ClipboardCheck
															className="h-8 w-8"
															style={{ color: "#8B5CF6" }}
														/>
													</div>
												</CardContent>
											</Card>
										</div>

										{/* Divisions */}
										<Card className="glass-card">
											<div className="glass-card-cap" />
											<CardHeader>
												<CardTitle className="h3 sidebar-gradient-text">
													{dept.name} Divisions
												</CardTitle>
											</CardHeader>
											<CardContent>
												{dept.divisions.length > 0 ? (
													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
														{dept.divisions.map((division) => (
															<Card
																key={division.id}
																className="bg-white/40 backdrop-blur border border-white/40"
															>
																<CardHeader className="pb-3">
																	<CardTitle className="text-sm text-navy">
																		{division.name}
																	</CardTitle>
																	<CardDescription className="text-xs">
																		{division.description}
																	</CardDescription>
																</CardHeader>
																<CardContent className="pt-0">
																	<div className="space-y-1 text-xs">
																		<div className="flex justify-between">
																			<span>Contracts:</span>
																			<span className="font-medium">
																				{division.stats.totalContracts}
																			</span>
																		</div>
																		<div className="flex justify-between">
																			<span>Staff:</span>
																			<span className="font-medium">
																				{division.stats.staffCount}
																			</span>
																		</div>
																		<div className="flex justify-between">
																			<span>Budget:</span>
																			<span className="font-medium">
																				$
																				{(
																					division.stats.totalBudget / 1000
																				).toFixed(0)}
																				K
																			</span>
																		</div>
																		<div className="flex justify-between">
																			<span>Compliance:</span>
																			<span className="font-medium">
																				{division.stats.complianceRate}%
																			</span>
																		</div>
																	</div>
																</CardContent>
															</Card>
														))}
													</div>
												) : (
													<div className="text-center py-8">
														<div className="flex flex-col items-center space-y-3">
															<Building className="h-12 w-12 text-slate-400" />
															<div>
																<h4 className="body-1 text-slate-600 mb-2">
																	No Divisions Found
																</h4>
																<p className="text-sm text-slate-500">
																	The {dept.name} department currently has no
																	divisions configured. All operations are
																	managed at the department level.
																</p>
															</div>
														</div>
													</div>
												)}
											</CardContent>
										</Card>
									</div>
								</TabsContent>
							))}
						</Tabs>
					) : null}
				</CardContent>
			</Card>

			{/* Tabbed Analytics Content */}
			<div ref={detailRef}>
				<Tabs defaultValue="overview" className="w-full">
					<TabsList className="responsive-tab-list h-auto bg-white/20 backdrop-blur border border-white/40 p-1">
						<TabsTrigger
							value="overview"
							className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
						>
							<BarChart3 className="h-4 w-4" />
							Overview
						</TabsTrigger>
						<TabsTrigger
							value="metrics"
							className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
						>
							<Activity className="h-4 w-4" />
							Metrics
						</TabsTrigger>
						<TabsTrigger
							value="compliance"
							className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
						>
							<Shield className="h-4 w-4" />
							Compliance
						</TabsTrigger>
						<TabsTrigger
							value="trends"
							className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
						>
							<TrendingUp className="h-4 w-4" />
							Trends
						</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent value="overview" className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Budget Allocation */}
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardHeader>
									<CardTitle className="h3 sidebar-gradient-text">
										Budget Allocation
									</CardTitle>
									<CardDescription className="text-slate-700">
										Department budget distribution
									</CardDescription>
								</CardHeader>
								<CardContent>
									<ResponsiveContainer width="100%" height={300}>
										<BarChart
											data={currentDepartmentData.budgetData}
											margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="rgba(3, 175, 191, 0.1)"
											/>
											<XAxis dataKey="department" stroke="#524E4E" />
											<YAxis stroke="#524E4E" />
											<Tooltip
												contentStyle={{
													backgroundColor: "rgba(255,255,255,0.9)",
													border: "1px solid rgba(255,255,255,0.2)",
													borderRadius: "8px",
												}}
											/>
											<Legend />
											<Bar dataKey="budget" fill="#03AFBF" />
											<Bar dataKey="spent" fill="#56B8FF" />
										</BarChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>

							{/* Monthly Expenses */}
							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardHeader>
									<CardTitle className="h3 sidebar-gradient-text">
										Monthly Expenses
									</CardTitle>
									<CardDescription className="text-slate-700">
										Expense trends over time
									</CardDescription>
								</CardHeader>
								<CardContent>
									<ResponsiveContainer width="100%" height={300}>
										<AreaChart
											data={currentDepartmentData.expensesData}
											margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="rgba(255,255,255,0.1)"
											/>
											<XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
											<YAxis stroke="rgba(255,255,255,0.6)" />
											<Tooltip
												contentStyle={{
													backgroundColor: "rgba(255,255,255,0.9)",
													border: "1px solid rgba(255,255,255,0.2)",
													borderRadius: "8px",
												}}
											/>
											<Area
												type="monotone"
												dataKey="expenses"
												stroke="#03AFBF"
												fill="#03AFBF"
												fillOpacity={0.3}
											/>
										</AreaChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</div>

						{/* Staff and Contract Distribution */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
								<CardHeader>
									<CardTitle className="h3 sidebar-gradient-text">
										Staff Distribution
									</CardTitle>
									<CardDescription className="text-slate-700">
										Staff by role and department
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{currentDepartmentData.staffData.map((item, index) => (
											<div
												key={index}
												className="flex items-center justify-between"
											>
												<span className="body-2 text-slate-700">
													{item.role}
												</span>
												<Badge
													variant="secondary"
													className="bg-white/20 backdrop-blur border border-white/40"
													style={{ color: "#524E4E" }}
												>
													{item.count}
												</Badge>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							<Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
								<CardHeader>
									<CardTitle className="h3 sidebar-gradient-text">
										Contract Types
									</CardTitle>
									<CardDescription className="text-slate-700">
										Distribution by contract type
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{currentDepartmentData.contractTypesData.map(
											(item, index) => (
												<div
													key={index}
													className="flex items-center justify-between"
												>
													<span className="body-2 text-slate-700">
														{item.type}
													</span>
													<Badge
														variant="secondary"
														className="bg-white/20 backdrop-blur border border-white/40"
														style={{ color: "#524E4E" }}
													>
														{item.count}
													</Badge>
												</div>
											),
										)}
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* Metrics Tab */}
					<TabsContent value="metrics" className="space-y-6">
						<div className="text-center py-12">
							<h3 className="h3 text-navy mb-4">Metrics Dashboard</h3>
							<p className="body-1 text-light-200">
								Detailed metrics and KPI tracking will be displayed here.
							</p>
						</div>
					</TabsContent>

					{/* Compliance Tab */}
					<TabsContent value="compliance" className="space-y-6">
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader>
								<CardTitle className="h3 sidebar-gradient-text">
									License Compliance
								</CardTitle>
								<CardDescription className="text-slate-700">
									Current compliance status
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={400}>
									<PieChart>
										<Pie
											data={currentDepartmentData.complianceData}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ name, percent }) =>
												`${name ?? ""} ${(Number(percent || 0) * 100).toFixed(
													0,
												)}%`
											}
											outerRadius={120}
											fill="#8884d8"
											dataKey="count"
										>
											{currentDepartmentData.complianceData.map(
												(entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												),
											)}
										</Pie>
										<Tooltip
											contentStyle={{
												backgroundColor: "rgba(255,255,255,0.9)",
												border: "1px solid rgba(255,255,255,0.2)",
												borderRadius: "8px",
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Trends Tab */}
					<TabsContent value="trends" className="space-y-6">
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardHeader>
								<CardTitle className="h3 sidebar-gradient-text">
									Contract Trends
								</CardTitle>
								<CardDescription className="text-slate-700">
									Monthly contract status overview
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={400}>
									<LineChart
										data={currentDepartmentData.trendsData}
										margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
									>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="rgba(255,255,255,0.1)"
										/>
										<XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
										<YAxis stroke="rgba(255,255,255,0.6)" />
										<Tooltip
											contentStyle={{
												backgroundColor: "rgba(255,255,255,0.9)",
												border: "1px solid rgba(255,255,255,0.2)",
												borderRadius: "8px",
											}}
										/>
										<Legend />
										<Line
											type="monotone"
											dataKey="active"
											stroke="#03AFBF"
											strokeWidth={2}
										/>
										<Line
											type="monotone"
											dataKey="pending"
											stroke="#56B8FF"
											strokeWidth={2}
										/>
										<Line
											type="monotone"
											dataKey="expired"
											stroke="#524E4E"
											strokeWidth={2}
										/>
									</LineChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
};

export default OrganizationAnalyticsDashboard;

"use client";

export const dynamic = "force-dynamic";

import {
	AlertCircle,
	BarChart3,
	Building2,
	Calendar,
	ClipboardCheck,
	Crown,
	DollarSign,
	FileText,
	Megaphone,
	Monitor,
	Scale,
	Shield,
	TrendingUp,
	Users,
	Wrench,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnalyticsComplianceTab } from "@/components/analytics/AnalyticsComplianceTab";
import AnalyticsErrorBoundary from "@/components/analytics/AnalyticsErrorBoundary";
import { AnalyticsReadinessSummary } from "@/components/analytics/AnalyticsReadinessOverview";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";
import { AnalyticsStatCard } from "@/components/analytics/AnalyticsStatCard";
import { AuditReadinessHero } from "@/components/analytics/AuditReadinessHero";
import { CalendarAnalyticsDashboard } from "@/components/analytics/CalendarAnalyticsDashboard";
import OrganizationAnalyticsDashboard from "@/components/analytics/OrganizationAnalyticsDashboard";
import ReportsPage from "@/components/ReportsPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DepartmentCardSkeleton,
	TabsSkeleton,
} from "@/components/ui/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mapDatabaseToRouteDivision } from "@/constants/navigation";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuditReadiness } from "@/hooks/useAuditReadiness";
import { usePermissions } from "@/hooks/usePermissions";
import { useUnifiedAnalyticsData } from "@/hooks/useUnifiedAnalyticsData";
import { useUserRole } from "@/hooks/useUserRole";
import type { AuditPeriod } from "@/lib/audits/types";

type AnalyticsTab = "organization" | "contracts" | "calendar" | "compliance";

const ANALYTICS_TABS: AnalyticsTab[] = [
	"organization",
	"contracts",
	"compliance",
	"calendar",
];

const AnalyticsPage = () => {
	const { division: userDivision, loading, role } = useUserRole();
	const { permissions } = usePermissions();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [selectedDepartment, setSelectedDepartment] = useState<string>("IT");

	const initialTab =
		(searchParams?.get("tab") as AnalyticsTab) || "organization";
	const [activeTab, setActiveTab] = useState<AnalyticsTab>(
		ANALYTICS_TABS.includes(initialTab) ? initialTab : "organization",
	);
	const [period, setPeriod] = useState<AuditPeriod>("30d");

	// Update tab when URL parameter changes
	useEffect(() => {
		const tabParam = searchParams?.get("tab") as AnalyticsTab | null;
		if (tabParam && ANALYTICS_TABS.includes(tabParam)) {
			setActiveTab(tabParam);
		}
	}, [searchParams]);
	const {
		departments,
		totals,
		hasContracts,
		isLoading: analyticsLoading,
		error: analyticsError,
	} = useUnifiedAnalyticsData();

	const { summary, isLoading: readinessLoading } = useAuditReadiness({
		period,
	});

	// Using mapDatabaseToRouteDivision from constants/navigation.ts

	// Redirect managers to their division page (but allow admins to stay on main analytics page)
	useEffect(() => {
		if (!loading && userDivision) {
			// Department Manager - redirect to their division
			if (
				permissions.includes(PERMISSIONS.CONTRACTS.VIEW) &&
				!permissions.includes(PERMISSIONS.SETTINGS.VIEW)
			) {
				const routeDivision = mapDatabaseToRouteDivision(userDivision);
				router.replace(`/analytics/${routeDivision}`);
			}
			// Note: Admins with SETTINGS.VIEW stay on this page to see both Contracts and Calendar analytics
		}
	}, [loading, permissions, userDivision, router]);

	// Show loading while redirecting (only for Department Managers)
	if (
		loading ||
		(permissions.includes(PERMISSIONS.CONTRACTS.VIEW) &&
			userDivision &&
			!permissions.includes(PERMISSIONS.SETTINGS.VIEW))
	) {
		return (
			<div className="space-y-6">
				{/* Header Skeleton */}
				<div className="mb-6">
					<div className="h-8 bg-white/20 rounded-xl w-1/3 mb-2 animate-pulse"></div>
					<div className="h-4 bg-white/20 rounded-xl w-1/2 animate-pulse"></div>
				</div>

				{/* Department Navigation Skeleton */}
				<div className="bg-white/30 backdrop-blur border border-white/40 shadow-lg rounded-xl p-6">
					<div className="h-6 bg-white/20 rounded-lg w-1/4 mb-6 animate-pulse"></div>

					{/* Tabs Skeleton */}
					<TabsSkeleton count={5} />

					{/* Content Skeleton */}
					<div className="space-y-6">
						<div className="flex items-center space-x-3 mb-6">
							<div className="w-12 h-12 bg-white/20 rounded-xl animate-pulse"></div>
							<div>
								<div className="h-6 bg-white/20 rounded-lg w-32 mb-2 animate-pulse"></div>
								<div className="h-4 bg-white/20 rounded-lg w-24 animate-pulse"></div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{[1, 2, 3].map((i) => (
								<DepartmentCardSkeleton key={i} />
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Only users with CONTRACTS.VIEW or SETTINGS.VIEW permission should see this page
	// Department Managers are redirected to their division page (handled above)
	// Admins and users with calendar permissions can see this page
	if (
		!permissions.includes(PERMISSIONS.CONTRACTS.VIEW) &&
		!permissions.includes(PERMISSIONS.SETTINGS.VIEW) &&
		!permissions.includes(PERMISSIONS.CALENDAR.VIEW_ALL) &&
		!permissions.includes(PERMISSIONS.CALENDAR.VIEW_TEAM)
	) {
		return null;
	}

	// Department configuration with icons and colors
	const departmentIcons = {
		IT: Monitor,
		Finance: DollarSign,
		Administration: Users,
		Legal: Scale,
		Operations: Building2,
		Sales: TrendingUp,
		Marketing: Megaphone,
		Executive: Crown,
		Engineering: Wrench,
	};

	const departmentColors = {
		IT: "bg-blue",
		Finance: "bg-green",
		Administration: "bg-purple-500",
		Legal: "bg-indigo-500",
		Operations: "bg-orange",
		Sales: "bg-red",
		Marketing: "bg-pink",
		Executive: "bg-yellow-500",
		Engineering: "bg-teal-500",
	};

	// Format currency
	const formatCurrency = (amount: number): string => {
		if (amount >= 1000000) {
			return `$${(amount / 1000000).toFixed(1)}M`;
		} else if (amount >= 1000) {
			return `$${(amount / 1000).toFixed(0)}K`;
		}
		return `$${amount.toFixed(0)}`;
	};

	// Handle tab change
	const handleTabChange = (value: string) => {
		setSelectedDepartment(value);
	};

	// Show error state
	if (analyticsError) {
		return (
			<div className="space-y-6">
				<div className="mb-6">
					<h1 className="h1 text-center sidebar-gradient-text mb-2">
						Reports & Analytics
					</h1>
					<p className="body-1 text-center text-slate-700">
						Comprehensive analytics and reporting for all departments
					</p>
				</div>
				<Card className="bg-red-50 border-red-200">
					<CardContent className="pt-6">
						<div className="flex items-center space-x-3">
							<AlertCircle className="h-6 w-6 text-red-500" />
							<div>
								<h3 className="text-lg font-semibold text-red-800">
									Error Loading Analytics
								</h3>
								<p className="text-red-600">
									{typeof analyticsError === "string"
										? analyticsError
										: analyticsError instanceof Error
											? analyticsError.message
											: String(analyticsError) ||
												"Failed to load department analytics data. Please try again later."}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Show no contracts state
	if (!analyticsLoading && !hasContracts) {
		return (
			<div className="space-y-6">
				<div className="mb-6">
					<h1 className="h1 text-center sidebar-gradient-text mb-2">
						Reports & Analytics
					</h1>
					<p className="body-1 text-center text-slate-700">
						Comprehensive analytics and reporting for all departments
					</p>
				</div>
				<Card className="bg-blue-50 border-blue-200">
					<CardContent className="pt-12 pb-12 text-center">
						<div className="flex flex-col items-center space-y-4">
							<div className="p-4 bg-blue-100 rounded-full">
								<BarChart3 className="h-12 w-12 text-blue-600" />
							</div>
							<div>
								<h3 className="text-xl font-semibold text-blue-800 mb-2">
									No Contracts Found
								</h3>
								<p className="text-blue-600 max-w-md">
									There are currently no contracts in the system. Upload your
									first contract to start tracking analytics and insights across
									departments and divisions.
								</p>
							</div>
							<div className="pt-4">
								<p className="text-sm text-blue-500">
									Once contracts are uploaded, you&apos;ll see real-time
									analytics here.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<AnalyticsPageShell
			title="Reports & analytics"
			subtitle="Comprehensive analytics and reporting for all departments"
		>
			<AnalyticsReadinessSummary
				overallComplianceRate={
					summary?.kpis.overallComplianceRate ?? totals.overallComplianceRate
				}
				departments={(
					departments as Array<{
						name: string;
						totalStats?: { complianceRate?: number };
					}>
				).map((dept) => ({
					name: dept.name,
					complianceRate: dept.totalStats?.complianceRate ?? 0,
				}))}
			/>

			<AuditReadinessHero
				score={summary?.readinessScore ?? totals.overallComplianceRate}
				ragStatus={summary?.ragStatus ?? "amber"}
				areasAtRisk={summary?.kpis.evidenceGaps ?? 0}
				upcomingDeadlines={summary?.kpis.upcomingDeadlines ?? 0}
				isLoading={readinessLoading}
				period={period}
				onPeriodChange={setPeriod}
				lastUpdated={summary?.lastUpdated}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<AnalyticsStatCard
					title="Total contracts"
					value={totals.totalContracts.toLocaleString()}
					icon={FileText}
				/>
				<AnalyticsStatCard
					title="Total budget"
					value={`$${(totals.totalBudget / 1000000).toFixed(1)}M`}
					icon={TrendingUp}
				/>
				<AnalyticsStatCard
					title="Active staff"
					value={totals.totalStaff.toLocaleString()}
					icon={Users}
				/>
				<AnalyticsStatCard
					title="Compliance rate"
					value={`${summary?.kpis.overallComplianceRate ?? totals.overallComplianceRate}%`}
					icon={ClipboardCheck}
				/>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(v) => {
					const newTab = v as AnalyticsTab;
					setActiveTab(newTab);
					const params = new URLSearchParams(searchParams?.toString() || "");
					params.set("tab", newTab);
					router.replace(`/analytics?${params.toString()}`, { scroll: false });
				}}
				className="w-full"
			>
				<TabsList className="responsive-tab-list h-auto w-full max-w-3xl bg-white/30 backdrop-blur border border-white/40 mb-6 p-1">
					<TabsTrigger
						value="organization"
						className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
					>
						<Building2 className="h-4 w-4" />
						<span>Organization</span>
					</TabsTrigger>
					<TabsTrigger
						value="contracts"
						className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
					>
						<FileText className="h-4 w-4" />
						<span>Contracts</span>
					</TabsTrigger>
					<TabsTrigger
						value="compliance"
						className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
					>
						<Shield className="h-4 w-4" />
						<span className="truncate">Compliance & audit</span>
					</TabsTrigger>
					<TabsTrigger
						value="calendar"
						className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
					>
						<Calendar className="h-4 w-4" />
						<span>Calendar</span>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="organization" className="mt-0">
					{permissions.includes(PERMISSIONS.SETTINGS.VIEW) ? (
						<AnalyticsErrorBoundary>
							<OrganizationAnalyticsDashboard />
						</AnalyticsErrorBoundary>
					) : (
						<Card className="bg-blue-50 border-blue-200">
							<CardContent className="pt-12 pb-12 text-center">
								<div className="flex flex-col items-center space-y-4">
									<div className="p-4 bg-blue-100 rounded-full">
										<AlertCircle className="h-12 w-12 text-blue-600" />
									</div>
									<div>
										<h3 className="text-xl font-semibold text-blue-800 mb-2">
											Access Restricted
										</h3>
										<p className="text-blue-600 max-w-md">
											You don&apos;t have permission to view organization
											analytics. Please contact your administrator for access.
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</TabsContent>
				<TabsContent value="contracts" className="mt-0">
					<div className="flex justify-center">
						<div>
							<h1 className="h1 sidebar-gradient-text text-center">
								Contracts Performance Dashboard
							</h1>
							<p className="body-1 text-light-200 text-center py-2">
								Performance metrics and insights for all contracts
							</p>
						</div>
					</div>
					{/* Department Navigation Tabs */}
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Department analytics
							</h2>
							<p className="text-sm text-slate-600 mt-1 mb-6">
								Compare contract volume, budget, staffing, and compliance across
								departments. Select a department below to drill into its
								divisions and details.
							</p>
							{analyticsLoading ? (
								<div className="space-y-6">
									<div className="flex w-full bg-white/20 backdrop-blur border border-white/40 rounded-lg p-1">
										{[...Array(5)].map((_, i) => (
											<div
												key={i}
												className="flex-1 h-10 bg-white/20 rounded-md animate-pulse mx-1"
											></div>
										))}
									</div>
									<div className="space-y-4">
										<div className="flex items-center space-x-3">
											<div className="w-12 h-12 bg-white/20 rounded-xl animate-pulse"></div>
											<div>
												<div className="h-6 bg-white/20 rounded-lg w-32 mb-2 animate-pulse"></div>
												<div className="h-4 bg-white/20 rounded-lg w-24 animate-pulse"></div>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
											{[...Array(3)].map((_, i) => (
												<div
													key={i}
													className="bg-white/95 backdrop-blur border border-gray-200 shadow-lg rounded-xl p-6"
												>
													<div className="flex items-start space-x-4 mb-4">
														<div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
														<div className="flex-1">
															<div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-2 animate-pulse"></div>
															<div className="h-4 bg-gray-200 rounded-lg w-full animate-pulse"></div>
														</div>
													</div>
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
														{[...Array(4)].map((_, j) => (
															<div
																key={j}
																className="h-20 bg-gray-200 rounded-lg animate-pulse"
															></div>
														))}
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							) : (
								<Tabs
									value={selectedDepartment}
									onValueChange={handleTabChange}
									className="w-full"
								>
									<TabsList className="flex w-full flex-wrap h-auto gap-1 bg-white/20 backdrop-blur border border-white/40 p-1">
										{departments.map((department) => {
											const dept = department as { name: string };
											return (
												<TabsTrigger
													key={dept.name}
													value={dept.name}
													className="flex-1 min-w-[4.5rem] data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm"
												>
													{dept.name}
												</TabsTrigger>
											);
										})}
									</TabsList>

									{/* Tab Content for each department */}
									{departments.map((department) => {
										const dept = department as {
											name: string;
											divisions: Array<{
												id: string;
												name: string;
												description: string;
												stats: {
													totalContracts: number;
													totalBudget: number;
													staffCount: number;
													complianceRate: number;
												};
											}>;
											totalStats: {
												totalContracts: number;
												totalBudget: number;
												staffCount: number;
												complianceRate: number;
											};
										};
										const IconComponent =
											departmentIcons[
												dept.name as keyof typeof departmentIcons
											] || BarChart3;
										const colorClass =
											departmentColors[
												dept.name as keyof typeof departmentColors
											] || "bg-gray-500";

										return (
											<TabsContent
												key={dept.name}
												value={dept.name}
												className="mt-6"
											>
												<div className="space-y-6">
													{/* Department Header */}
													<div className="flex items-center space-x-3 mb-6">
														<div
															className={`p-3 rounded-xl ${colorClass} shadow-lg`}
														>
															<IconComponent className="h-6 w-6 text-white" />
														</div>
														<div>
															<h2 className="h2 text-navy">{dept.name}</h2>
															<p className="body-1 text-slate-700">
																{dept.divisions.length} division
																{dept.divisions.length !== 1 ? "s" : ""}
															</p>
														</div>
													</div>

													{/* Department Summary Stats */}
													<div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/20 backdrop-blur border border-white/40 rounded-xl">
														<div className="text-center">
															<div className="text-2xl font-bold text-navy">
																{dept.totalStats.totalContracts}
															</div>
															<div className="text-sm text-slate-600">
																Total Contracts
															</div>
														</div>
														<div className="text-center">
															<div className="text-2xl font-bold text-navy">
																{formatCurrency(dept.totalStats.totalBudget)}
															</div>
															<div className="text-sm text-slate-600">
																Total Budget
															</div>
														</div>
														<div className="text-center">
															<div className="text-2xl font-bold text-navy">
																{dept.totalStats.staffCount}
															</div>
															<div className="text-sm text-slate-600">
																Staff
															</div>
														</div>
														<div className="text-center">
															<div className="text-2xl font-bold text-navy">
																{dept.totalStats.complianceRate}%
															</div>
															<div className="text-sm text-slate-600">
																Compliance
															</div>
														</div>
													</div>

													{/* Division Cards Grid */}
													{dept.divisions.length > 0 ? (
														<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
															{dept.divisions.map((division) => (
																<Card
																	key={division.id}
																	className="glass-card interactive-glass-card"
																>
																	<CardHeader className="pb-4 px-6 pt-6">
																		<div className="flex items-start space-x-4">
																			<div
																				className={`p-3 rounded-lg ${colorClass} shadow-md flex-shrink-0`}
																			>
																				<BarChart3 className="h-6 w-6 text-white" />
																			</div>
																			<div className="flex-1 min-w-0">
																				<CardTitle className="text-xl font-bold text-gray-800 mb-1 truncate">
																					{division.name}
																				</CardTitle>
																				<p className="text-sm text-gray-600 line-clamp-2">
																					{division.description}
																				</p>
																			</div>
																		</div>
																	</CardHeader>
																	<CardContent className="pt-0 px-6 pb-6">
																		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
																			<div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
																				<div className="text-xl font-bold text-gray-800 mb-1">
																					{division.stats.totalContracts}
																				</div>
																				<div className="text-xs text-gray-600">
																					Contracts
																				</div>
																			</div>
																			<div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
																				<div className="text-xl font-bold text-gray-800 mb-1">
																					{formatCurrency(
																						division.stats.totalBudget,
																					)}
																				</div>
																				<div className="text-xs text-gray-600">
																					Budget
																				</div>
																			</div>
																			<div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
																				<div className="text-xl font-bold text-gray-800 mb-1">
																					{division.stats.staffCount}
																				</div>
																				<div className="text-xs text-gray-600">
																					Staff
																				</div>
																			</div>
																			<div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
																				<div className="text-xl font-bold text-gray-800 mb-1">
																					{division.stats.complianceRate}%
																				</div>
																				<div className="text-xs text-gray-600">
																					Compliance
																				</div>
																			</div>
																		</div>
																	</CardContent>
																</Card>
															))}
														</div>
													) : (
														/* No divisions message */
														<div className="text-center py-12">
															<div className="mb-4">
																<IconComponent className="h-16 w-16 text-slate-400 mx-auto" />
															</div>
															<h3 className="h3 text-navy mb-2">
																No Divisions Available
															</h3>
															<p className="body-1 text-slate-700 mb-4">
																There are currently no divisions or metrics
																available for the {dept.name} department.
															</p>
															<p className="body-2 text-slate-600">
																Please check back later or contact your
																administrator for more information.
															</p>
														</div>
													)}

													{/* Reports Section for this department */}
													{dept.divisions.length > 0 && (
														<div className="border-t border-white/20 pt-6">
															<h3 className="h3 sidebar-gradient-text mb-6">
																{dept.name} Reports
															</h3>
															<div className="bg-white/30 backdrop-blur border border-white/40 rounded-xl shadow-lg">
																<ReportsPage />
															</div>
														</div>
													)}
												</div>
											</TabsContent>
										);
									})}
								</Tabs>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="compliance" className="mt-0">
					<AnalyticsComplianceTab period={period} />
				</TabsContent>

				<TabsContent value="calendar" className="mt-0">
					<CalendarAnalyticsDashboard />
				</TabsContent>
			</Tabs>
		</AnalyticsPageShell>
	);
};

export default AnalyticsPage;

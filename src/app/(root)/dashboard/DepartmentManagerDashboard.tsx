"use client";

import { AlertTriangle } from "lucide-react";
import type { Models } from "node-appwrite";
import ContractExpiryAlertsWidget from "@/components/ContractExpiryAlertsWidget";
import { DepartmentActionQueue } from "@/components/dashboard/department/DepartmentActionQueue";
import { DepartmentComplianceHero } from "@/components/dashboard/department/DepartmentComplianceHero";
import { DepartmentContractsTable } from "@/components/dashboard/department/DepartmentContractsTable";
import { DepartmentDashboardHeader } from "@/components/dashboard/department/DepartmentDashboardHeader";
import { DepartmentMonitoringGrid } from "@/components/dashboard/department/DepartmentMonitoringGrid";
import { DepartmentRecentActivity } from "@/components/dashboard/department/DepartmentRecentActivity";
import { DepartmentStatCardRow } from "@/components/dashboard/department/DepartmentStatCardRow";
import { RiskImpactHeroCard } from "@/components/dashboard/RiskImpactHeroCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDepartmentDashboardData } from "@/hooks/useDepartmentDashboardData";
import { useRiskImpactDashboard } from "@/hooks/useRiskImpactDashboard";

interface DepartmentManagerDashboardProps {
	user?:
		| (Models.User<Models.Preferences> & {
				$id: string;
				accountId?: string;
				fullName?: string;
				name?: string;
				role?: string;
				division?: string;
		  })
		| null;
}

export default function DepartmentManagerDashboard({
	user,
}: DepartmentManagerDashboardProps) {
	const division = user?.division || "";
	const { data, error, isLoading, refresh } =
		useDepartmentDashboardData(division);
	const {
		snapshot: riskImpact,
		isLoading: riskImpactLoading,
		error: riskImpactError,
		refresh: refreshRiskImpact,
	} = useRiskImpactDashboard({ division: division || undefined });

	const displayName = user?.fullName || user?.name;

	if (!division) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<DepartmentDashboardHeader
					division=""
					departmentLabel=""
					userName={displayName}
				/>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-8 text-center">
						<AlertTriangle className="w-12 h-12 text-orange mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-slate-700 mb-2">
							Division not assigned
						</h3>
						<p className="text-sm text-slate-600 mb-4">
							Your profile needs a division before this dashboard can show
							department-scoped metrics.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<DepartmentDashboardHeader
					division={division}
					departmentLabel=""
					userName={displayName}
				/>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-8 text-center">
						<AlertTriangle className="w-12 h-12 text-red mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-red mb-2">
							Error loading department dashboard
						</h3>
						<p className="text-slate-600 text-sm mb-4">
							{error instanceof Error ? error.message : "Something went wrong"}
						</p>
						<div className="flex justify-center">
							<Button onClick={() => refresh()} className="primary-btn">
								Try again
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const areasAtRisk =
		(data?.monitoring.contracts.needsAttention || 0) +
		(data?.monitoring.calendar.needsAttention || 0) +
		(data?.monitoring.licenses.needsAttention || 0);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-0">
			<DepartmentDashboardHeader
				division={data?.division || division}
				departmentLabel={data?.departmentLabel || ""}
				userName={displayName}
			/>

			<RiskImpactHeroCard
				snapshot={riskImpact}
				isLoading={riskImpactLoading}
				error={riskImpactError}
				onRetry={() => refreshRiskImpact()}
			/>

			<DepartmentStatCardRow
				stats={data?.stats ?? null}
				isLoading={isLoading}
				division={data?.division || division}
			/>

			{data ? (
				<DepartmentComplianceHero
					complianceRate={data.stats.complianceRate}
					departmentLabel={data.departmentLabel}
					division={data.division}
					areasAtRisk={areasAtRisk}
				/>
			) : isLoading ? (
				<div className="mb-6 h-36 rounded-lg bg-slate-200/60 animate-pulse" />
			) : null}

			{/* Row 1: Things to do | Monitoring — equal height */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
				<div className="lg:col-span-2 min-h-0 h-full flex">
					<DepartmentActionQueue
						items={data?.actionQueue || []}
						isLoading={isLoading}
					/>
				</div>
				<div className="min-h-0 h-full flex">
					{data ? (
						<DepartmentMonitoringGrid monitoring={data.monitoring} />
					) : (
						<div className="h-full min-h-64 w-full rounded-lg bg-slate-200/60 animate-pulse" />
					)}
				</div>
			</div>

			{/* Row 2: Contracts needing attention | Contract Expiry Alerts — equal height */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
				<div className="lg:col-span-2 min-h-0 h-full flex">
					<DepartmentContractsTable
						contracts={data?.contractsAtRisk || []}
						isLoading={isLoading}
					/>
				</div>
				<div className="min-h-0 h-full flex w-full">
					<ContractExpiryAlertsWidget
						className="w-full"
						maxVisible={3}
						compact
						contracts={data?.contractsForAlerts}
					/>
				</div>
			</div>

			{/* Row 3: Recent activity — same width as Contracts needing attention */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<div className="lg:col-span-2">
					<DepartmentRecentActivity
						activities={data?.recentActivity || []}
						isLoading={isLoading}
					/>
				</div>
			</div>
		</div>
	);
}

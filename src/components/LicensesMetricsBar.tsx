"use client";

import {
	AlertTriangle,
	ChartColumnIncreasing,
	CheckCircle,
	ClipboardList,
	DollarSign,
	FileText,
	RefreshCw,
	ShieldAlert,
} from "lucide-react";
import { useMemo } from "react";
import CountUp from "react-countup";
import { useLicensesView } from "@/components/LicensesView";
import { Card, CardContent } from "@/components/ui/card";
import {
	computeLicenseMetrics,
	getLicenseExpiryRaw,
	parseLicenseExpiryDate,
	type LicenseStatusTab,
} from "@/lib/licenses/licensesListUtils";
import { cn } from "@/lib/utils";
import type { License } from "@/types/licenses";

interface LicensesMetricsBarProps {
	licenses: License[];
}

const interactiveCard =
	"glass-card interactive-glass-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 transition-all duration-200 w-full text-left";

export default function LicensesMetricsBar({
	licenses,
}: LicensesMetricsBarProps) {
	const { setStatusTab, clearFilters, scrollToList, setFilters } =
		useLicensesView();

	const metrics = useMemo(() => computeLicenseMetrics(licenses), [licenses]);

	const hasExpiryDates = useMemo(
		() =>
			licenses.some((l) => Boolean(parseLicenseExpiryDate(getLicenseExpiryRaw(l)))),
		[licenses],
	);

	const goTab = (tab: LicenseStatusTab) => {
		setStatusTab(tab);
		scrollToList();
	};

	const formattedPipelineCost = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
		useGrouping: true,
	}).format(metrics.renewalPipelineCost);

	return (
		<section className="mb-6 w-full space-y-6">
			{/* Tier 1 — contracts parity */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{metrics.totalCost > 0 && (
					<Card className="glass-card min-w-0">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								Total Cost
							</p>
							<div className="flex items-center gap-2 pt-2">
								<span className="text-2xl sm:text-3xl font-bold text-slate-700 tabular-nums">
									$
									<CountUp end={metrics.totalCost} duration={1.2} separator="," />
								</span>
								<DollarSign className="h-8 w-8 text-[#0f5384] shrink-0" />
							</div>
							<p className="text-xs text-slate-600 mt-1">
								Sum of license costs
							</p>
						</CardContent>
					</Card>
				)}

				<button
					type="button"
					className="text-left"
					onClick={() => {
						clearFilters();
						scrollToList();
					}}
				>
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">
								Total Licenses
							</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span className="tabular-nums">
									<CountUp end={metrics.totalLicenses} duration={1.2} />
								</span>
								<span className="inline-block ml-2 pb-1">
									<FileText className="h-8 w-8 text-[#0f5384]" />
								</span>
							</div>
							<p className="text-xs text-slate-600 mt-1">Click to show all</p>
						</CardContent>
					</Card>
				</button>

				<button type="button" className="text-left" onClick={() => goTab("active")}>
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text">Active</p>
							<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
								<span className="tabular-nums">
									<CountUp end={metrics.activeCount} duration={1.2} />
								</span>
								<span className="inline-block ml-2 pb-1">
									<CheckCircle className="h-8 w-8 text-green" />
								</span>
							</div>
							<p className="text-xs text-slate-600 mt-1">
								{metrics.totalLicenses > 0
									? `${Math.round(
											(metrics.activeCount / metrics.totalLicenses) * 100,
										)}% of total`
									: "No licenses"}
							</p>
						</CardContent>
					</Card>
				</button>

				{hasExpiryDates && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("expiring")}
					>
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Expiring Soon
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span className="tabular-nums">
										<CountUp end={metrics.totalExpiring} duration={1.2} />
									</span>
									<span className="inline-block pb-1">
										<AlertTriangle className="h-8 w-8 text-orange" />
									</span>
								</div>
								<div className="flex items-center justify-between gap-2 mt-2 text-xs text-slate-600">
									<span>30d: {metrics.expiring.in30}</span>
									<span>60d: {metrics.expiring.in60}</span>
									<span>90d: {metrics.expiring.in90}</span>
								</div>
							</CardContent>
						</Card>
					</button>
				)}
			</div>

			{/* Tier 2 — org intelligence */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
				{metrics.totalQuantity > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => {
							clearFilters();
							scrollToList();
						}}
					>
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Seat utilization
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span className="tabular-nums">
										{metrics.utilizationRate.toFixed(1)}%
									</span>
									<ChartColumnIncreasing className="h-8 w-8 text-[#0f5384]" />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									{metrics.usedQuantity.toLocaleString()} of{" "}
									{metrics.totalQuantity.toLocaleString()} seats used
								</p>
							</CardContent>
						</Card>
					</button>
				)}

				{metrics.complianceAtRiskCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("compliance-risk")}
					>
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Compliance at risk
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span className="tabular-nums">
										<CountUp end={metrics.complianceAtRiskCount} duration={1.2} />
									</span>
									<ShieldAlert className="h-8 w-8 text-red" />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									At-risk or non-compliant
								</p>
							</CardContent>
						</Card>
					</button>
				)}

				{metrics.actionRequiredCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("action-required")}
					>
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Action required
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span className="tabular-nums">
										<CountUp end={metrics.actionRequiredCount} duration={1.2} />
									</span>
									<ClipboardList className="h-8 w-8 text-orange" />
								</div>
								<p className="text-xs text-slate-600 mt-1">Needs owner follow-up</p>
							</CardContent>
						</Card>
					</button>
				)}

				{metrics.pendingCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("pending")}
					>
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Pending review
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span className="tabular-nums">
										<CountUp end={metrics.pendingCount} duration={1.2} />
									</span>
									<FileText className="h-8 w-8 text-orange" />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									Pending or suspended
								</p>
							</CardContent>
						</Card>
					</button>
				)}

				{metrics.autoRenewWatchCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => {
							setFilters((prev) => ({ ...prev, autoRenew: true }));
							setStatusTab("expiring");
							scrollToList();
						}}
					>
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Auto-renew watch
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span className="tabular-nums">
										<CountUp end={metrics.autoRenewWatchCount} duration={1.2} />
									</span>
									<RefreshCw className="h-8 w-8 text-[#03AFBF]" />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									Auto-renew within 90 days
								</p>
							</CardContent>
						</Card>
					</button>
				)}

				{metrics.renewalPipelineCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("expiring")}
					>
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Renewal pipeline
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span className="tabular-nums">
										<CountUp end={metrics.renewalPipelineCount} duration={1.2} />
									</span>
									<RefreshCw className="h-8 w-8 text-slate-600" />
								</div>
								<p className="text-xs text-slate-600 mt-1">
									{metrics.renewalPipelineCost > 0
										? `$${formattedPipelineCost} at stake (120d)`
										: "Expiring within 120 days"}
								</p>
							</CardContent>
						</Card>
					</button>
				)}
			</div>
		</section>
	);
}

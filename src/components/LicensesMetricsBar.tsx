"use client";

import {
	AlertTriangle,
	ChartColumnIncreasing,
	CheckCircle,
	ClipboardList,
	Clock,
	DollarSign,
	FileText,
	RefreshCw,
	ShieldAlert,
	TrendingDown,
} from "lucide-react";
import { useMemo } from "react";
import CountUp from "react-countup";
import { useLicensesView } from "@/components/LicensesView";
import {
	complianceMetricTone,
	MetricStatCard,
} from "@/components/ui/metric-stat-card";
import {
	computeLicenseMetrics,
	getLicenseExpiryRaw,
	type LicenseStatusTab,
	matchesStatusTab,
	parseLicenseExpiryDate,
} from "@/lib/licenses/licensesListUtils";
import type { License } from "@/types/licenses";

interface LicensesMetricsBarProps {
	licenses: License[];
}

export default function LicensesMetricsBar({
	licenses,
}: LicensesMetricsBarProps) {
	const { statusTab, setStatusTab, clearFilters, scrollToList, setFilters } =
		useLicensesView();

	const metrics = useMemo(() => computeLicenseMetrics(licenses), [licenses]);

	const totalCostForTab = useMemo(() => {
		let totalCost = 0;
		const sumActiveOnly = statusTab === "active";
		licenses.forEach((license) => {
			const cost = Number(license.cost) || 0;
			if (!cost) return;
			const isActive = matchesStatusTab(license, "active");
			if (sumActiveOnly) {
				if (isActive) totalCost += cost;
			} else if (statusTab === "all" || matchesStatusTab(license, statusTab)) {
				totalCost += cost;
			}
		});
		return { totalCost, sumActiveOnly };
	}, [licenses, statusTab]);

	const hasExpiryDates = useMemo(
		() =>
			licenses.some((l) =>
				Boolean(parseLicenseExpiryDate(getLicenseExpiryRaw(l))),
			),
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
	const utilizationTone = complianceMetricTone(metrics.utilizationRate);
	const activeShare =
		metrics.totalLicenses > 0
			? Math.round((metrics.activeCount / metrics.totalLicenses) * 100)
			: null;

	return (
		<section className="mb-6 w-full space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{metrics.totalCost > 0 && (
					<MetricStatCard
						title="Total Cost"
						value={
							<>
								$
								<CountUp
									end={totalCostForTab.totalCost}
									duration={1.2}
									separator=","
								/>
							</>
						}
						description={
							totalCostForTab.sumActiveOnly
								? "Sum of active license costs"
								: "Sum of license costs"
						}
						icon={DollarSign}
						valueClassName="text-2xl sm:text-3xl"
					/>
				)}

				<button
					type="button"
					className="text-left"
					onClick={() => {
						clearFilters();
						scrollToList();
					}}
				>
					<MetricStatCard
						interactive
						title="Total Licenses"
						value={<CountUp end={metrics.totalLicenses} duration={1.2} />}
						description="Click to show all"
						icon={FileText}
					/>
				</button>

				<button
					type="button"
					className="text-left"
					onClick={() => goTab("active")}
				>
					<MetricStatCard
						interactive
						title="Active"
						value={<CountUp end={metrics.activeCount} duration={1.2} />}
						description={
							activeShare != null ? `${activeShare}% of total` : "No licenses"
						}
						icon={CheckCircle}
						iconTone="success"
					/>
				</button>

				{hasExpiryDates && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("expiring")}
					>
						<MetricStatCard
							interactive
							title="Expiring Soon"
							value={<CountUp end={metrics.totalExpiring} duration={1.2} />}
							description={
								<span className="flex items-center gap-2">
									<span>30d: {metrics.expiring.in30}</span>
									<span>60d: {metrics.expiring.in60}</span>
									<span>90d: {metrics.expiring.in90}</span>
								</span>
							}
							icon={AlertTriangle}
							iconTone={metrics.totalExpiring > 0 ? "warning" : "default"}
							dynamicIcon={metrics.totalExpiring > 0 ? Clock : undefined}
							dynamicTone="warning"
							valueTone={metrics.totalExpiring > 0 ? "warning" : "default"}
						/>
					</button>
				)}
			</div>

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
						<MetricStatCard
							interactive
							title="Seat utilization"
							value={`${metrics.utilizationRate.toFixed(1)}%`}
							description={`${metrics.usedQuantity.toLocaleString()} of ${metrics.totalQuantity.toLocaleString()} seats used`}
							icon={ChartColumnIncreasing}
							iconTone={utilizationTone}
							dynamicIcon={
								utilizationTone === "danger" ? TrendingDown : CheckCircle
							}
							dynamicTone={utilizationTone}
							valueTone={utilizationTone}
						/>
					</button>
				)}

				{metrics.complianceAtRiskCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("compliance-risk")}
					>
						<MetricStatCard
							interactive
							title="Compliance at risk"
							value={
								<CountUp end={metrics.complianceAtRiskCount} duration={1.2} />
							}
							description="At-risk or non-compliant"
							icon={ShieldAlert}
							iconTone="danger"
							dynamicIcon={AlertTriangle}
							dynamicTone="danger"
							valueTone="danger"
						/>
					</button>
				)}

				{metrics.actionRequiredCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("action-required")}
					>
						<MetricStatCard
							interactive
							title="Action required"
							value={
								<CountUp end={metrics.actionRequiredCount} duration={1.2} />
							}
							description="Needs owner follow-up"
							icon={ClipboardList}
							iconTone="warning"
							dynamicIcon={Clock}
							dynamicTone="warning"
							valueTone="warning"
						/>
					</button>
				)}

				{metrics.pendingCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("pending")}
					>
						<MetricStatCard
							interactive
							title="Pending review"
							value={<CountUp end={metrics.pendingCount} duration={1.2} />}
							description="Pending or suspended"
							icon={FileText}
							iconTone="warning"
							dynamicIcon={Clock}
							dynamicTone="warning"
						/>
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
						<MetricStatCard
							interactive
							title="Auto-renew watch"
							value={
								<CountUp end={metrics.autoRenewWatchCount} duration={1.2} />
							}
							description="Auto-renew within 90 days"
							icon={RefreshCw}
							dynamicIcon={Clock}
							dynamicTone="warning"
						/>
					</button>
				)}

				{metrics.renewalPipelineCount > 0 && (
					<button
						type="button"
						className="text-left"
						onClick={() => goTab("expiring")}
					>
						<MetricStatCard
							interactive
							title="Renewal pipeline"
							value={
								<CountUp end={metrics.renewalPipelineCount} duration={1.2} />
							}
							description={
								metrics.renewalPipelineCost > 0
									? `$${formattedPipelineCost} at stake (120d)`
									: "Expiring within 120 days"
							}
							icon={RefreshCw}
							dynamicIcon={Clock}
							dynamicTone="warning"
						/>
					</button>
				)}
			</div>
		</section>
	);
}

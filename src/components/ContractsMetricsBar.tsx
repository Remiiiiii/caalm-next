"use client";

import {
	AlertTriangle,
	CheckCircle,
	Clock,
	DollarSign,
	FileText,
} from "lucide-react";
import { useMemo } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import {
	MetricFlatSparkline,
	MetricProgressRing,
	MetricSegmentBar,
	MetricStatCard,
} from "@/components/ui/metric-stat-card";
import {
	isExpiringWithinDays,
	matchesStatusTab,
	parseExpiryDate,
} from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";

interface ContractsMetricsBarProps {
	files: UIFileDoc[];
}

function formatTotalValue(amount: number): string {
	if (amount >= 1_000_000_000) {
		return `${(amount / 1_000_000_000).toFixed(1)}B`;
	}
	if (amount >= 1_000_000) {
		return `${(amount / 1_000_000).toFixed(1)}M`;
	}
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		useGrouping: true,
	}).format(amount);
}

export default function ContractsMetricsBar({
	files,
}: ContractsMetricsBarProps) {
	const { statusTab, setStatusTab, clearFilters, scrollToList } =
		useContractsView();

	const expiringContracts = useMemo(() => {
		return {
			in30: files.filter((f) => isExpiringWithinDays(f, 30)).length,
			in60: files.filter((f) => {
				if (!isExpiringWithinDays(f, 60)) return false;
				return !isExpiringWithinDays(f, 30);
			}).length,
			in90: files.filter((f) => {
				if (!isExpiringWithinDays(f, 90)) return false;
				return !isExpiringWithinDays(f, 60);
			}).length,
		};
	}, [files]);

	const metrics = useMemo(() => {
		let totalValue = 0;
		let activeCount = 0;
		let activeValue = 0;
		let pendingValue = 0;
		let expiredValue = 0;
		let active = 0;
		let pending = 0;
		let expired = 0;
		const sumActiveOnly = statusTab === "active";

		files.forEach((file) => {
			const amount = Number(file.amount) || 0;
			const isActive = matchesStatusTab(file, "active");
			const isExpired = matchesStatusTab(file, "expired");

			if (isActive) {
				activeCount += 1;
				active += 1;
				activeValue += amount;
			} else if (isExpired) {
				expired += 1;
				expiredValue += amount;
			} else {
				// Pending + other non-live statuses (inactive, pending-signature, etc.)
				pending += 1;
				pendingValue += amount;
			}

			if (sumActiveOnly) {
				if (isActive) totalValue += amount;
			} else if (statusTab === "all" || matchesStatusTab(file, statusTab)) {
				totalValue += amount;
			}
		});

		return {
			totalValue,
			activeCount,
			totalContracts: files.length,
			sumActiveOnly,
			statusBreakdown: { active, pending, expired },
			valueBreakdown: { activeValue, pendingValue, expiredValue },
		};
	}, [files, statusTab]);

	const hasContractsWithExpiryDates = useMemo(
		() =>
			files.some((file) => Boolean(parseExpiryDate(file.contractExpiryDate))),
		[files],
	);

	const formattedTotalValue = formatTotalValue(metrics.totalValue);
	const usesAbbreviation = metrics.totalValue >= 1_000_000;
	const totalExpiring =
		expiringContracts.in30 + expiringContracts.in60 + expiringContracts.in90;
	const activeShare =
		metrics.totalContracts > 0
			? Math.round((metrics.activeCount / metrics.totalContracts) * 100)
			: null;

	const totalValueFontClass = usesAbbreviation
		? "text-2xl sm:text-3xl"
		: metrics.totalValue >= 100_000
			? "text-xl sm:text-2xl"
			: "text-2xl sm:text-3xl";

	const { statusBreakdown, valueBreakdown } = metrics;
	const valueSegmentTotal =
		valueBreakdown.activeValue +
		valueBreakdown.pendingValue +
		valueBreakdown.expiredValue;

	return (
		<section className="mb-6 w-full">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<MetricStatCard
					title="Total Value"
					value={`$${formattedTotalValue}`}
					description={
						metrics.sumActiveOnly
							? "Sum of active contract amounts"
							: "Sum of contract amounts"
					}
					icon={DollarSign}
					valueClassName={totalValueFontClass}
					footer={
						valueSegmentTotal > 0 ? (
							<MetricSegmentBar
								formatValue={(n) => `$${formatTotalValue(n)}`}
								segments={[
									{
										key: "active",
										label: "Active",
										count: valueBreakdown.activeValue,
										colorClass: "bg-green",
										textClass: "text-green",
									},
									{
										key: "pending",
										label: "Pending",
										count: valueBreakdown.pendingValue,
										colorClass: "bg-orange",
										textClass: "text-orange",
									},
									{
										key: "expired",
										label: "Expired",
										count: valueBreakdown.expiredValue,
										colorClass: "bg-slate-300",
										textClass: "text-slate-500",
									},
								]}
							/>
						) : (
							<p className="text-[11px] leading-snug text-slate-500">
								No amounts recorded on these contracts
							</p>
						)
					}
				/>

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
						title="Total Contracts"
						value={metrics.totalContracts.toLocaleString()}
						description="Across this list · click to show all"
						icon={FileText}
						footer={
							<MetricSegmentBar
								segments={[
									{
										key: "active",
										label: "Active",
										count: statusBreakdown.active,
										colorClass: "bg-green",
										textClass: "text-green",
									},
									{
										key: "pending",
										label: "Pending",
										count: statusBreakdown.pending,
										colorClass: "bg-orange",
										textClass: "text-orange",
									},
									{
										key: "expired",
										label: "Expired",
										count: statusBreakdown.expired,
										colorClass: "bg-slate-300",
										textClass: "text-slate-500",
									},
								]}
							/>
						}
					/>
				</button>

				{hasContractsWithExpiryDates && (
					<button
						type="button"
						className="text-left"
						onClick={() => {
							setStatusTab("expiring");
							scrollToList();
						}}
					>
						<MetricStatCard
							interactive
							title="Expiring Soon"
							value={totalExpiring}
							description="Within 90 days · click to filter"
							icon={AlertTriangle}
							iconTone={totalExpiring > 0 ? "warning" : "default"}
							dynamicIcon={totalExpiring > 0 ? Clock : undefined}
							dynamicTone="warning"
							valueTone={totalExpiring > 0 ? "warning" : "default"}
							footer={
								totalExpiring === 0 ? (
									<div className="space-y-2">
										<MetricFlatSparkline tone="success" />
										<p className="text-[11px] leading-snug text-slate-500">
											{metrics.totalContracts} contract
											{metrics.totalContracts === 1 ? "" : "s"} monitored —
											none approaching expiry
										</p>
									</div>
								) : (
									<MetricSegmentBar
										segments={[
											{
												key: "30",
												label: "30d",
												count: expiringContracts.in30,
												colorClass: "bg-red",
												textClass: "text-red",
											},
											{
												key: "60",
												label: "60d",
												count: expiringContracts.in60,
												colorClass: "bg-orange",
												textClass: "text-orange",
											},
											{
												key: "90",
												label: "90d",
												count: expiringContracts.in90,
												colorClass: "bg-blue",
												textClass: "text-blue",
											},
										]}
									/>
								)
							}
						/>
					</button>
				)}

				<button
					type="button"
					className="text-left"
					onClick={() => {
						setStatusTab("active");
						scrollToList();
					}}
				>
					<MetricStatCard
						interactive
						title="Active"
						value={metrics.activeCount}
						description={
							activeShare != null
								? `${activeShare}% of total · click to filter`
								: "No contracts"
						}
						icon={CheckCircle}
						iconTone="success"
						footer={
							activeShare != null ? (
								<div className="flex items-center gap-3">
									<MetricProgressRing
										percent={activeShare}
										tone={
											activeShare >= 80
												? "success"
												: activeShare >= 50
													? "default"
													: "warning"
										}
									/>
									<p className="text-[11px] leading-snug text-slate-500">
										{metrics.activeCount} of {metrics.totalContracts} contracts
										are live
									</p>
								</div>
							) : (
								<p className="text-[11px] leading-snug text-slate-500">
									Add contracts to see the active share
								</p>
							)
						}
					/>
				</button>
			</div>
		</section>
	);
}

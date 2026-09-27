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
import { MetricStatCard } from "@/components/ui/metric-stat-card";
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
		const sumActiveOnly = statusTab === "active";
		files.forEach((file) => {
			const isActive = matchesStatusTab(file, "active");
			if (isActive) activeCount++;
			if (sumActiveOnly) {
				if (isActive) totalValue += Number(file.amount) || 0;
			} else if (statusTab === "all" || matchesStatusTab(file, statusTab)) {
				totalValue += Number(file.amount) || 0;
			}
		});
		return {
			totalValue,
			activeCount,
			totalContracts: files.length,
			sumActiveOnly,
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
						description="Click to show all"
						icon={FileText}
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
							description={
								<span className="flex items-center gap-2">
									<span>30d: {expiringContracts.in30}</span>
									<span>60d: {expiringContracts.in60}</span>
									<span>90d: {expiringContracts.in90}</span>
								</span>
							}
							icon={AlertTriangle}
							iconTone={totalExpiring > 0 ? "warning" : "default"}
							dynamicIcon={totalExpiring > 0 ? Clock : undefined}
							dynamicTone="warning"
							valueTone={totalExpiring > 0 ? "warning" : "default"}
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
							activeShare != null ? `${activeShare}% of total` : "No contracts"
						}
						icon={CheckCircle}
						iconTone="success"
					/>
				</button>
			</div>
		</section>
	);
}

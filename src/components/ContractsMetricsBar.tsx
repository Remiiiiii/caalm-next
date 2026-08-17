"use client";

import { AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { useMemo } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import {
	isExpiringWithinDays,
	matchesStatusTab,
	parseExpiryDate,
} from "@/lib/contracts/contractsListUtils";
import { cn } from "@/lib/utils";
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
			// Active tab: Total Value = $ sum of active contract amounts only
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

	const interactiveCard =
		"glass-card interactive-glass-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 transition-all duration-200";

	const formattedTotalValue = formatTotalValue(metrics.totalValue);
	const usesAbbreviation = metrics.totalValue >= 1_000_000;

	const totalValueFontClass = usesAbbreviation
		? "text-2xl sm:text-3xl"
		: metrics.totalValue >= 100_000
			? "text-xl sm:text-2xl"
			: "text-2xl sm:text-3xl";

	return (
		<section className="mb-6 w-full">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="glass-card min-w-0">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<div className="min-w-0 w-full">
							<p className="text-sm font-medium sidebar-gradient-text">
								Total Value
							</p>
							<div className="flex items-end gap-1.5 sm:gap-2 pt-2 min-w-0 w-full">
								<span
									className={cn(
										"min-w-0 font-bold text-slate-700 tabular-nums leading-tight warp-break-words",
										totalValueFontClass,
									)}
								>
									${formattedTotalValue}
								</span>
							</div>
							<p className="text-xs text-slate-600 mt-1">
								{metrics.sumActiveOnly
									? "Sum of active contract amounts"
									: "Sum of contract amounts"}
							</p>
						</div>
					</CardContent>
				</Card>

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
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										Total Contracts
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>{metrics.totalContracts.toLocaleString()}</span>
										<StatCardIcon className="ml-2" icon={FileText} />
									</div>
									<p className="text-xs text-slate-600 mt-1">
										Click to show all
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
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
						<Card className={cn(interactiveCard)}>
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text">
									Expiring Soon
								</p>
								<div className="flex items-center text-3xl font-bold text-slate-700 pt-2 gap-2">
									<span>
										{expiringContracts.in30 +
											expiringContracts.in60 +
											expiringContracts.in90}
									</span>
									<StatCardIcon
										icon={AlertTriangle}
										iconClassName="text-orange"
									/>
								</div>
								<div className="flex items-center justify-between gap-2 mt-2 text-xs text-slate-600">
									<span>30d: {expiringContracts.in30}</span>
									<span>60d: {expiringContracts.in60}</span>
									<span>90d: {expiringContracts.in90}</span>
								</div>
							</CardContent>
						</Card>
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
					<Card className={cn(interactiveCard)}>
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										Active
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>{metrics.activeCount}</span>
										<StatCardIcon
											className="ml-2"
											icon={CheckCircle}
											iconClassName="text-green"
										/>
									</div>
									<p className="text-xs text-slate-600 mt-1">
										{metrics.totalContracts > 0
											? `${Math.round(
													(metrics.activeCount / metrics.totalContracts) * 100,
												)}% of total`
											: "No contracts"}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</button>
			</div>
		</section>
	);
}

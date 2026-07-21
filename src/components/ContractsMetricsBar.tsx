"use client";

import { AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { useMemo } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import { Card, CardContent } from "@/components/ui/card";
import {
	isExpiringWithinDays,
	parseExpiryDate,
} from "@/lib/contracts/contractsListUtils";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

interface ContractsMetricsBarProps {
	files: UIFileDoc[];
}

export default function ContractsMetricsBar({
	files,
}: ContractsMetricsBarProps) {
	const { setStatusTab, clearFilters, scrollToList } = useContractsView();

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
		files.forEach((file) => {
			totalValue += Number(file.amount) || 0;
			if (file.status === "active") activeCount++;
		});
		return {
			totalValue,
			activeCount,
			totalContracts: files.length,
		};
	}, [files]);

	const hasContractsWithExpiryDates = useMemo(
		() =>
			files.some((file) => Boolean(parseExpiryDate(file.contractExpiryDate))),
		[files],
	);

	const interactiveCard =
		"glass-card interactive-glass-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 transition-all duration-200";

	const formattedTotalValue = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		useGrouping: true,
	}).format(metrics.totalValue);

	const totalValueFontClass =
		metrics.totalValue >= 10_000_000
			? "text-base sm:text-lg lg:text-xl"
			: metrics.totalValue >= 1_000_000
				? "text-lg sm:text-xl lg:text-2xl"
				: metrics.totalValue >= 100_000
					? "text-xl sm:text-2xl"
					: "text-2xl sm:text-3xl";

	return (
		<section className="mb-6 w-full">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{metrics.totalValue > 0 && (
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
									Sum of contract amounts
								</p>
							</div>
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
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										Total Contracts
									</p>
									<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
										<span>{metrics.totalContracts.toLocaleString()}</span>
										<span className="inline-block ml-2 pb-1">
											<FileText className="h-8 w-8 text-slate-600" />
										</span>
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
									<span className="inline-block pb-1">
										<AlertTriangle className="h-8 w-8 text-slate-600" />
									</span>
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
										<span className="inline-block ml-2 pb-1">
											<CheckCircle className="h-8 w-8 text-slate-600" />
										</span>
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

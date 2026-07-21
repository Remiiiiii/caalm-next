"use client";

import { useMemo } from "react";
import { useLicensesView } from "@/components/LicensesView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	computeLicenseMetrics,
	isComplianceAtRisk,
	isLicenseExpired,
	isLicenseExpiringWithinDays,
	type LicenseStatusTab,
} from "@/lib/licenses/licensesListUtils";
import { cn } from "@/lib/utils";
import type { License } from "@/types/licenses";

interface LicensesStatusTabsProps {
	licenses: License[];
}

export default function LicensesStatusTabs({
	licenses,
}: LicensesStatusTabsProps) {
	const { statusTab, setStatusTab, scrollToList } = useLicensesView();

	const counts = useMemo(() => {
		const metrics = computeLicenseMetrics(licenses);
		let complianceRisk = 0;
		licenses.forEach((license) => {
			if (isComplianceAtRisk(license)) complianceRisk++;
		});
		return {
			all: licenses.length,
			active: metrics.activeCount,
			pending: metrics.pendingCount,
			expiring: licenses.filter((l) => isLicenseExpiringWithinDays(l, 90))
				.length,
			expired: licenses.filter((l) => isLicenseExpired(l)).length,
			"action-required": metrics.actionRequiredCount,
			"compliance-risk": complianceRisk,
		};
	}, [licenses]);

	const tabs: { value: LicenseStatusTab; label: string; count: number }[] = [
		{ value: "all", label: "All", count: counts.all },
		{ value: "active", label: "Active", count: counts.active },
		{ value: "pending", label: "Pending", count: counts.pending },
		{ value: "expiring", label: "Expiring", count: counts.expiring },
		{ value: "expired", label: "Expired", count: counts.expired },
		{
			value: "action-required",
			label: "Action",
			count: counts["action-required"],
		},
		{
			value: "compliance-risk",
			label: "Compliance",
			count: counts["compliance-risk"],
		},
	];

	return (
		<div className="px-4 sm:px-6 pt-4 border-b border-slate-200/80">
			<Tabs
				value={statusTab}
				onValueChange={(v) => {
					setStatusTab(v as LicenseStatusTab);
					scrollToList();
				}}
			>
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto gap-1 bg-slate-100/80 p-1">
					{tabs.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className={cn(
								"cursor-pointer text-xs sm:text-sm py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm",
							)}
						>
							<span className="sidebar-gradient-text font-medium">
								{tab.label}
							</span>
							<span className="ml-1.5 text-slate-500 tabular-nums">
								{tab.count}
							</span>
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</div>
	);
}

"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContractsView } from "@/components/ContractsViewContext";
import {
	type StatusTab,
	isContractExpired,
	isExpiringWithinDays,
} from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";
import { cn } from "@/lib/utils";

interface ContractsStatusTabsProps {
	files: UIFileDoc[];
}

export default function ContractsStatusTabs({ files }: ContractsStatusTabsProps) {
	const { statusTab, setStatusTab, scrollToList } = useContractsView();

	const counts = useMemo(() => {
		let active = 0;
		let pending = 0;
		let expiring = 0;
		let expired = 0;
		files.forEach((file) => {
			if (isContractExpired(file)) {
				expired++;
				return;
			}
			if (file.status === "active") active++;
			if (
				file.status === "pending-review" ||
				file.status === "action-required"
			) {
				pending++;
			}
			if (isExpiringWithinDays(file, 90)) expiring++;
		});
		return {
			all: files.length,
			active,
			pending,
			expiring,
			expired,
		};
	}, [files]);

	const tabs: { value: StatusTab; label: string; count: number }[] = [
		{ value: "all", label: "All", count: counts.all },
		{ value: "active", label: "Active", count: counts.active },
		{ value: "pending", label: "Pending", count: counts.pending },
		{ value: "expiring", label: "Expiring", count: counts.expiring },
		{ value: "expired", label: "Expired", count: counts.expired },
	];

	return (
		<div className="px-4 sm:px-6 pt-4 border-b border-slate-200/80">
			<Tabs
				value={statusTab}
				onValueChange={(v) => {
					setStatusTab(v as StatusTab);
					scrollToList();
				}}
			>
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1 bg-slate-100/80 p-1">
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

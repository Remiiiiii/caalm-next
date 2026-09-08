"use client";

import { useMemo } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import StatusUnderlineTabs from "@/components/StatusUnderlineTabs";
import {
	isContractExpired,
	isExpiringWithinDays,
	type StatusTab,
} from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";

interface ContractsStatusTabsProps {
	files: UIFileDoc[];
}

export default function ContractsStatusTabs({
	files,
}: ContractsStatusTabsProps) {
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

	const tabs = [
		{ value: "all", label: "All", count: counts.all },
		{ value: "active", label: "Active", count: counts.active },
		{ value: "pending", label: "Pending", count: counts.pending },
		{ value: "expiring", label: "Expiring", count: counts.expiring },
		{ value: "expired", label: "Expired", count: counts.expired },
	];

	return (
		<StatusUnderlineTabs
			tabs={tabs}
			value={statusTab}
			indicatorId="contracts-status-underline"
			listClassName="grid-cols-2 sm:grid-cols-5"
			onValueChange={(v) => {
				setStatusTab(v as StatusTab);
				scrollToList();
			}}
		/>
	);
}

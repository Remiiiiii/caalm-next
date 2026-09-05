"use client";

import { useMemo } from "react";
import { useLicensesView } from "@/components/LicensesView";
import StatusUnderlineTabs from "@/components/StatusUnderlineTabs";
import {
	computeLicenseMetrics,
	isComplianceAtRisk,
	isLicenseExpired,
	isLicenseExpiringWithinDays,
	type LicenseStatusTab,
} from "@/lib/licenses/licensesListUtils";
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

	const tabs = [
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
		<StatusUnderlineTabs
			tabs={tabs}
			value={statusTab}
			indicatorId="licenses-status-underline"
			listClassName="grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
			onValueChange={(v) => {
				setStatusTab(v as LicenseStatusTab);
				scrollToList();
			}}
		/>
	);
}

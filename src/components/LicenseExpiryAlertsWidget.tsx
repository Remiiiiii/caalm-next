"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { CompactLicenseExpiryWidget } from "@/components/license-expiry-alerts/CompactLicenseExpiryWidget";
import { FullLicenseExpiryWidget } from "@/components/license-expiry-alerts/FullLicenseExpiryWidget";
import {
	FILTER_VALUES,
	getDaysUntilLicenseExpiry,
	isWidgetLicenseExpired,
	licenseAsAlarmContract,
	type License,
	type LicenseExpiryAlertsWidgetProps,
	matchesWidgetLicenseExpiryFilter,
} from "@/components/license-expiry-alerts/types";
import { useContractAlarm } from "@/hooks/useContractAlarm";
import { swrConfig } from "@/lib/swr-config";

const ALL_LICENSES_KEY = "/api/licenses?limit=500";

async function fetchLicenses(url: string): Promise<License[]> {
	const response = await fetch(url);
	if (!response.ok) throw new Error("Failed to load license data");
	const json = await response.json();
	const payload = json?.data ?? json;
	if (Array.isArray(payload?.licenses)) return payload.licenses as License[];
	if (Array.isArray(payload)) return payload as License[];
	return [];
}

const LicenseExpiryAlertsWidget = ({
	className = "",
	maxVisible: _maxVisible = 2,
	showSettings = true,
	compact = false,
	licenses: propsLicenses,
	parentLoading = false,
	syncExpiredOnMount = true,
	alarmEnabled = true,
}: LicenseExpiryAlertsWidgetProps) => {
	// Trust any explicit prop, including [] — parent owns the list.
	const hasPropLicenses = propsLicenses !== undefined;
	const skipFetch = hasPropLicenses || parentLoading;

	const {
		data: fetchedLicenses,
		error: fetchError,
		isLoading: fetchLoading,
		mutate,
	} = useSWR(skipFetch ? null : ALL_LICENSES_KEY, fetchLicenses, {
		...swrConfig,
		refreshInterval: 30000,
		revalidateOnFocus: false,
	});

	const licenses = hasPropLicenses ? propsLicenses : fetchedLicenses || [];
	const isLoading = parentLoading || (!hasPropLicenses && fetchLoading);
	const error = hasPropLicenses
		? null
		: fetchError
			? fetchError instanceof Error
				? fetchError
				: new Error("Failed to load license data")
			: null;

	useEffect(() => {
		if (!syncExpiredOnMount) return;
		let cancelled = false;
		const syncExpiredLicenses = async () => {
			try {
				const response = await fetch("/api/contracts/update-expired", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
				});
				if (response.ok && !cancelled) {
					void mutate();
				}
			} catch {
				// Background sync — date-based filters still work offline.
			}
		};
		void syncExpiredLicenses();
		return () => {
			cancelled = true;
		};
	}, [mutate, syncExpiredOnMount]);

	const [filterDays, setFilterDays] = useState<number>(
		FILTER_VALUES.THIRTY_DAYS,
	);
	const [isMinimized, setIsMinimized] = useState(false);

	const licensesArray = useMemo(() => {
		return Array.isArray(licenses) ? licenses : [];
	}, [licenses]);

	const alarmContracts = useMemo(
		() => licensesArray.map(licenseAsAlarmContract),
		[licensesArray],
	);

	const {
		isPlaying,
		silenceAlarm,
		dismissAlarm,
		expiredContractsCount: expiredLicensesCount,
	} = useContractAlarm({
		// Empty list when disabled so this instance never stops a sibling widget's alarm
		contracts: alarmEnabled ? alarmContracts : [],
		enabled: alarmEnabled,
	});

	const filteredLicenses = useMemo(() => {
		if (!licensesArray.length) return [];

		return licensesArray
			.filter((license) =>
				matchesWidgetLicenseExpiryFilter(license, filterDays),
			)
			.sort(
				(a, b) => getDaysUntilLicenseExpiry(a) - getDaysUntilLicenseExpiry(b),
			);
	}, [licensesArray, filterDays]);

	const expiredCountFromAll = useMemo(() => {
		return licensesArray.filter(isWidgetLicenseExpired).length;
	}, [licensesArray]);

	const expiringCountFromFiltered = useMemo(() => {
		if (filterDays === FILTER_VALUES.EXPIRED) return 0;
		return licensesArray.filter((license) =>
			matchesWidgetLicenseExpiryFilter(license, filterDays),
		).length;
	}, [licensesArray, filterDays]);

	const getUrgencyStats = useCallback(() => {
		const stats = {
			expired: 0,
			critical: 0,
			warning: 0,
			attention: 0,
		};

		filteredLicenses.forEach((license) => {
			const days = getDaysUntilLicenseExpiry(license);
			if (isWidgetLicenseExpired(license)) {
				stats.expired++;
			} else if (days <= 7) {
				stats.critical++;
			} else if (days <= 30) {
				stats.warning++;
			} else {
				stats.attention++;
			}
		});

		return stats;
	}, [filteredLicenses]);

	const urgencyStats = useMemo(() => getUrgencyStats(), [getUrgencyStats]);

	if (compact) {
		return (
			<CompactLicenseExpiryWidget
				className={className}
				isLoading={isLoading}
				error={error}
				filteredLicenses={filteredLicenses}
				filterDays={filterDays}
				onFilterChange={setFilterDays}
				expiringCount={expiringCountFromFiltered}
				expiredCount={expiredCountFromAll}
				isPlaying={isPlaying}
				onSilence={silenceAlarm}
				onDismiss={dismissAlarm}
			/>
		);
	}

	return (
		<FullLicenseExpiryWidget
			className={className}
			isLoading={isLoading}
			error={error}
			filteredLicenses={filteredLicenses}
			filterDays={filterDays}
			onFilterChange={setFilterDays}
			expiringCount={expiringCountFromFiltered}
			expiredCount={expiredCountFromAll}
			expiredLicensesCount={expiredLicensesCount}
			isPlaying={isPlaying}
			onSilence={silenceAlarm}
			onDismiss={dismissAlarm}
			urgencyStats={urgencyStats}
			isMinimized={isMinimized}
			onToggleMinimize={() => setIsMinimized(!isMinimized)}
			showSettings={showSettings}
		/>
	);
};

export default LicenseExpiryAlertsWidget;

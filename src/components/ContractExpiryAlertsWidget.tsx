"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useContractAlarm } from "@/hooks/useContractAlarm";
import { useManagerContracts } from "@/hooks/useManagerContracts";
import { swrConfig, swrKeys } from "@/lib/swr-config";
import { CompactContractExpiryWidget } from "./contract-expiry-alerts/CompactContractExpiryWidget";
import { FullContractExpiryWidget } from "./contract-expiry-alerts/FullContractExpiryWidget";
import {
	type Contract,
	type ContractExpiryAlertsWidgetProps,
	FILTER_VALUES,
	getDaysUntilExpiry,
	isWidgetContractExpired,
	matchesWidgetExpiryFilter,
} from "./contract-expiry-alerts/types";

const ContractExpiryAlertsWidget = ({
	className = "",
	maxVisible = 2,
	showSettings = true,
	compact = false,
	contracts: propsContracts,
	parentLoading = false,
	syncExpiredOnMount = true,
	alarmEnabled = true,
}: ContractExpiryAlertsWidgetProps) => {
	const hasPropContracts = propsContracts !== undefined;
	const skipFetch = hasPropContracts || parentLoading;

	const {
		data: allContractsData,
		error: allContractsError,
		isLoading: allContractsLoading,
	} = useSWR(
		skipFetch ? null : swrKeys.allContracts(),
		swrConfig.fetcher || null,
		{
			...swrConfig,
			refreshInterval: 30000,
			revalidateOnFocus: false,
		},
	);

	const {
		contracts: hookContracts,
		isLoading: hookLoading,
	} = useManagerContracts({ enabled: !skipFetch });

	// Extract contracts from API response (wrapped in { success: true, data: [...] })
	const allContracts = Array.isArray(allContractsData)
		? allContractsData
		: allContractsData?.data || [];

	const contracts = hasPropContracts
		? propsContracts
		: allContractsError
			? hookContracts
			: allContracts;
	const isLoading = parentLoading
		? true
		: hasPropContracts
			? false
			: allContractsError
				? hookLoading
				: allContractsLoading;
	const error = hasPropContracts
		? null
		: allContractsError &&
				!hookLoading &&
				(!hookContracts || hookContracts.length === 0)
			? allContractsError
			: null;

	useEffect(() => {
		if (!syncExpiredOnMount) return;
		const updateExpiredContracts = async () => {
			try {
				await fetch("/api/contracts/update-expired", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
				});
			} catch {
				// Background sync — date-based filters still work without it.
			}
		};
		void updateExpiredContracts();
	}, [syncExpiredOnMount]);

	/**
	 * Filter value for contract display
	 * - EXPIRED (-1): Show only expired contracts
	 * - THIRTY_DAYS (30): Show contracts expiring within 30 days
	 * - SIXTY_DAYS (60): Show contracts expiring in 31-60 days
	 * - NINETY_DAYS (90): Show contracts expiring in 61-90 days
	 * - SIX_MONTHS (180): Show contracts expiring in 91-180 days
	 * - ONE_YEAR (365): Show contracts expiring in 181-365 days
	 * Default is THIRTY_DAYS (30 days)
	 */
	const [filterDays, setFilterDays] = useState<number>(
		FILTER_VALUES.THIRTY_DAYS,
	);
	const [isMinimized, setIsMinimized] = useState(false);

	// Ensure contracts is always an array for stable hook dependencies
	const contractsArray = useMemo(() => {
		return Array.isArray(contracts) ? contracts : [];
	}, [contracts]);

	// Contract alarm hook
	const {
		isPlaying,
		isSilenced,
		silenceAlarm,
		dismissAlarm,
		expiringContractsCount,
		expiredContractsCount,
	} = useContractAlarm({
		contracts: contractsArray,
		enabled: alarmEnabled,
	});

	// Same rules as /contracts Expiring / Expired tabs and metrics buckets
	const filteredContracts = useMemo(() => {
		if (!contractsArray.length) return [];

		return contractsArray
			.filter((contract: Contract) =>
				matchesWidgetExpiryFilter(contract, filterDays),
			)
			.sort((a: Contract, b: Contract) => {
				return getDaysUntilExpiry(a) - getDaysUntilExpiry(b);
			});
	}, [contractsArray, filterDays]);

	const expiredCountFromAll = useMemo(() => {
		return contractsArray.filter(isWidgetContractExpired).length;
	}, [contractsArray]);

	const expiringCountFromFiltered = useMemo(() => {
		if (filterDays === FILTER_VALUES.EXPIRED) return 0;
		return contractsArray.filter((contract: Contract) =>
			matchesWidgetExpiryFilter(contract, filterDays),
		).length;
	}, [contractsArray, filterDays]);

	// Calculate urgency stats for filtered contracts
	const getUrgencyStats = useCallback(() => {
		const stats = {
			expired: 0,
			critical: 0, // 1-7 days
			warning: 0, // 8-30 days
			attention: 0, // 31-90 days
		};

		filteredContracts.forEach((contract: Contract) => {
			const days = getDaysUntilExpiry(contract);
			if (isWidgetContractExpired(contract)) {
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
	}, [filteredContracts]);

	const urgencyStats = useMemo(() => getUrgencyStats(), [getUrgencyStats]);

	// Render compact or full widget
	if (compact) {
		return (
			<CompactContractExpiryWidget
				className={className}
				isLoading={isLoading}
				error={error}
				filteredContracts={filteredContracts}
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
		<FullContractExpiryWidget
			className={className}
			isLoading={isLoading}
			error={error}
			filteredContracts={filteredContracts}
			filterDays={filterDays}
			onFilterChange={setFilterDays}
			expiringCount={expiringCountFromFiltered}
			expiredCount={expiredCountFromAll}
			expiredContractsCount={expiredContractsCount}
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

export default ContractExpiryAlertsWidget;

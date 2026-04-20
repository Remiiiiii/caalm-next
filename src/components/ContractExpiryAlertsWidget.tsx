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
	getFilterRange,
} from "./contract-expiry-alerts/types";

const ContractExpiryAlertsWidget = ({
	className = "",
	maxVisible = 2,
	showSettings = true,
	compact = false,
	contracts: propsContracts,
}: ContractExpiryAlertsWidgetProps) => {
	// Use contracts from props if provided, otherwise fetch all contracts from database
	const {
		data: allContractsData,
		error: allContractsError,
		isLoading: allContractsLoading,
	} = useSWR(
		propsContracts ? null : swrKeys.allContracts(),
		swrConfig.fetcher || null,
		{
			...swrConfig,
			refreshInterval: 30000, // Refresh every 30 seconds
			revalidateOnFocus: false,
		},
	);

	// Fallback to manager contracts hook if all contracts endpoint fails
	const {
		contracts: hookContracts,
		isLoading: hookLoading,
		error: hookError,
	} = useManagerContracts();

	// Extract contracts from API response (wrapped in { success: true, data: [...] })
	const allContracts = Array.isArray(allContractsData)
		? allContractsData
		: allContractsData?.data || [];

	// Use props first, then all contracts, then manager contracts
	const contracts = propsContracts || allContracts || hookContracts;
	const isLoading = propsContracts ? false : allContractsLoading || hookLoading;
	const error = propsContracts ? null : allContractsError || hookError;

	// Trigger update of expired contracts when component mounts
	useEffect(() => {
		// Call the update-expired endpoint to ensure isExpired is up-to-date
		const updateExpiredContracts = async () => {
			try {
				const response = await fetch("/api/contracts/update-expired", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
				});
				if (response.ok) {
					const result = await response.json();
					if (process.env.NODE_ENV === "development") {
						console.log(
							"[ContractExpiryAlertsWidget] Updated expired contracts:",
							result,
						);
					}
				}
			} catch (error) {
				// Silently fail - this is a background update
				console.warn("Failed to update expired contracts:", error);
			}
		};

		// Only call once when component mounts, not on every render
		updateExpiredContracts();
	}, []); // Empty dependency array - only run once on mount

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
	const [filterDays, setFilterDays] = useState(FILTER_VALUES.THIRTY_DAYS);
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
		enabled: true,
	});

	// Filter contracts to show those expiring within the selected filter period
	// Implement infinite scroll - show all filtered contracts
	const filteredContracts = useMemo(() => {
		if (!contracts || contracts.length === 0) return [];

		const filtered = contracts
			.filter((contract: Contract) => {
				// Must have either contractExpiryDate or daysUntilExpiry
				if (
					!contract.contractExpiryDate &&
					contract.daysUntilExpiry === undefined
				) {
					return false;
				}

				// Calculate days until expiry once
				const daysUntilExpiry = getDaysUntilExpiry(contract);

				// Check if contract is expired - ONLY use database flag
				// Ignore date calculation to avoid inconsistencies with database state
				const isExpired = contract.isExpired === true;

				// Special filter value EXPIRED means "Expired" filter is selected
				if (filterDays === FILTER_VALUES.EXPIRED) {
					// Only show expired contracts
					return isExpired;
				}

				// For all other filter values, exclude expired contracts
				if (isExpired) {
					return false;
				}

				// Get filter range for the selected period
				const range = getFilterRange(filterDays);
				if (!range) return false;

				return daysUntilExpiry >= range.min && daysUntilExpiry <= range.max;
			})
			.sort((a: Contract, b: Contract) => {
				const daysA = getDaysUntilExpiry(a);
				const daysB = getDaysUntilExpiry(b);
				return daysA - daysB; // Sort by urgency (least days first)
			});

		// Debug logging in development
		if (process.env.NODE_ENV === "development") {
			const expiredInList = filtered.filter((c: Contract) => {
				const days = getDaysUntilExpiry(c);
				const isExpiredByDate = days < 0;
				const isExplicitlyExpired = c.isExpired === true;
				return isExpiredByDate || isExplicitlyExpired;
			});
			const expiringInList = filtered.filter((c: Contract) => {
				const days = getDaysUntilExpiry(c);
				const isExpiredByDate = days < 0;
				const isExplicitlyExpired = c.isExpired === true;
				const isExpired = isExpiredByDate || isExplicitlyExpired;
				return !isExpired && days >= 0 && days <= filterDays;
			});
			console.log("[ContractExpiryAlertsWidget] Filtered contracts:", {
				total: contracts.length,
				filtered: filtered.length,
				expiredInFiltered: expiredInList.length,
				expiringInFiltered: expiringInList.length,
				filterDays,
				allContracts: contracts.map((c: Contract) => ({
					id: c.$id,
					name: c.contractName,
					days: getDaysUntilExpiry(c),
					isExpired: c.isExpired,
					isExpiredByDate: getDaysUntilExpiry(c) < 0,
					isInFilterRange:
						getDaysUntilExpiry(c) >= 0 && getDaysUntilExpiry(c) <= filterDays,
				})),
				filteredContracts: filtered.map((c: Contract) => ({
					id: c.$id,
					name: c.contractName,
					days: getDaysUntilExpiry(c),
					isExpired: c.isExpired,
				})),
			});
		}

		return filtered;
	}, [contracts, filterDays]);

	// Calculate expired count from ALL contracts
	// ONLY use database isExpired flag as the source of truth
	const expiredCountFromAll = useMemo(() => {
		if (!contracts || contracts.length === 0) return 0;
		return contracts.filter((contract: Contract) => {
			// Only count contracts explicitly marked as expired in the database
			return contract.isExpired === true;
		}).length;
	}, [contracts]);

	// Calculate expiring count from ALL contracts
	// This shows contracts expiring within the selected filter period
	// Excludes contracts that have already expired
	const expiringCountFromFiltered = useMemo(() => {
		if (!contracts || contracts.length === 0) return 0;

		const expiringContracts = contracts.filter((contract: Contract) => {
			// Must have expiry date or daysUntilExpiry
			if (
				!contract.contractExpiryDate &&
				contract.daysUntilExpiry === undefined
			) {
				return false;
			}

			// Calculate days until expiry
			const daysUntilExpiry = getDaysUntilExpiry(contract);

			// Skip contracts with invalid expiry dates (Infinity means no valid date)
			if (daysUntilExpiry === Infinity || daysUntilExpiry === -Infinity) {
				return false;
			}

			// Check if contract is expired - ONLY use database flag
			// Ignore date calculation to avoid inconsistencies with database state
			const isExpired = contract.isExpired === true;

			// Skip expired contracts
			if (isExpired) {
				return false;
			}

			// Get filter range for the selected period
			const range = getFilterRange(filterDays);
			if (!range) return false;

			return daysUntilExpiry >= range.min && daysUntilExpiry <= range.max;
		});

		// Debug logging in development
		if (process.env.NODE_ENV === "development") {
			console.log("[ContractExpiryAlertsWidget] Expiring count calculation:", {
				totalContracts: contracts.length,
				filterDays,
				expiringCount: expiringContracts.length,
				contracts: contracts.map((c: Contract) => {
					const days = getDaysUntilExpiry(c);
					const isExpiredByDate = days < 0;
					const isExpired = c.isExpired === true;
					const hasValidDate = days !== Infinity && days !== -Infinity;
					const isInRange = hasValidDate && days >= 0 && days <= filterDays;
					const willBeIncluded = hasValidDate && !isExpired && isInRange;

					return {
						id: c.$id,
						name: c.contractName,
						contractExpiryDate: c.contractExpiryDate,
						daysUntilExpiry: days,
						isExpiredDB: c.isExpired,
						isExpiredByDate,
						isExpired,
						hasValidDate,
						isInRange,
						willBeIncluded,
					};
				}),
			});
		}

		return expiringContracts.length;
	}, [contracts, filterDays]);

	// Calculate urgency stats for filtered contracts
	const getUrgencyStats = useCallback(() => {
		const stats = {
			expired: 0,
			critical: 0, // 1-7 days
			warning: 0, // 8-30 days
			attention: 0, // 31-90 days
		};

		filteredContracts.forEach((contract: Contract) => {
			// Check if contract is expired - prioritize date calculation
			// Contracts expiring today (days = 0) should be counted as expiring, not expired
			const days = getDaysUntilExpiry(contract);
			const isContractExpired = days < 0; // Only truly expired if days < 0
			const isExplicitlyExpired = contract.isExpired === true;
			const isExpired = isContractExpired || isExplicitlyExpired;

			if (isExpired) {
				stats.expired++;
			} else {
				// Include contracts expiring today (days = 0) in the urgency stats
				if (days <= 7) stats.critical++;
				else if (days <= 30) stats.warning++;
				else stats.attention++;
			}
		});

		return stats;
	}, [filteredContracts]);

	const urgencyStats = useMemo(() => getUrgencyStats(), [getUrgencyStats]);

	// Render compact or full widget
	if (compact) {
		return (
			<CompactContractExpiryWidget
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

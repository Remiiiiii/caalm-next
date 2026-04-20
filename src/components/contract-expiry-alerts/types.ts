/**
 * Shared types, constants, and utilities for contract expiry alert components
 */

export interface Contract {
	$id: string;
	contractName: string;
	name?: string;
	contractExpiryDate?: string;
	isExpired?: boolean; // From database
	status?: string;
	amount?: number;
	daysUntilExpiry?: number;
	compliance?: string;
	assignedManagers?: string[];
	fileId?: string;
	fileRef?: unknown;
}

export interface ContractExpiryAlertsWidgetProps {
	className?: string;
	maxVisible?: number;
	showSettings?: boolean;
	compact?: boolean; // For carousel mode
	contracts?: Contract[]; // Optional: pass contracts directly (from ContractsMetricsBar or page data)
}

/**
 * Filter value constants
 * - EXPIRED (-1): Show only expired contracts
 * - THIRTY_DAYS (30): Show contracts expiring within 30 days
 * - SIXTY_DAYS (60): Show contracts expiring in 31-60 days
 * - NINETY_DAYS (90): Show contracts expiring in 61-90 days
 * - SIX_MONTHS (180): Show contracts expiring in 91-180 days
 * - ONE_YEAR (365): Show contracts expiring in 181-365 days
 */
export const FILTER_VALUES = {
	EXPIRED: -1,
	THIRTY_DAYS: 30,
	SIXTY_DAYS: 60,
	NINETY_DAYS: 90,
	SIX_MONTHS: 180,
	ONE_YEAR: 365,
} as const;

/**
 * Get the min and max day range for a given filter value
 * @param filterDays - The filter value (30, 60, 90, 180, 365, or -1 for expired)
 * @returns Object with min and max days, or null for expired filter
 */
export const getFilterRange = (
	filterDays: number,
): { min: number; max: number } | null => {
	if (filterDays === FILTER_VALUES.EXPIRED) return null;

	const ranges: Record<number, { min: number; max: number }> = {
		[FILTER_VALUES.THIRTY_DAYS]: { min: 0, max: 30 },
		[FILTER_VALUES.SIXTY_DAYS]: { min: 31, max: 60 },
		[FILTER_VALUES.NINETY_DAYS]: { min: 61, max: 90 },
		[FILTER_VALUES.SIX_MONTHS]: { min: 91, max: 180 },
		[FILTER_VALUES.ONE_YEAR]: { min: 181, max: 365 },
	};

	return ranges[filterDays] || { min: 0, max: filterDays };
};

/**
 * Get appropriate empty state message based on filter selection
 * @param filterDays - The current filter value
 * @returns Object with title and subtitle for empty state
 */
export const getEmptyStateMessage = (filterDays: number) => {
	if (filterDays === FILTER_VALUES.EXPIRED) {
		return {
			title: "No expired contracts",
			subtitle: "All contracts are active",
		};
	}

	const periodText =
		filterDays === FILTER_VALUES.THIRTY_DAYS
			? "within 30 days"
			: filterDays === FILTER_VALUES.SIXTY_DAYS
				? "in 31-60 days"
				: filterDays === FILTER_VALUES.NINETY_DAYS
					? "in 61-90 days"
					: filterDays === FILTER_VALUES.SIX_MONTHS
						? "in 91-180 days (6 months)"
						: filterDays === FILTER_VALUES.ONE_YEAR
							? "in 181-365 days (1 year)"
							: `within ${filterDays} days`;

	return {
		title: `No contracts expiring ${periodText}`,
		subtitle: "All contracts are within safe periods",
	};
};

/**
 * Calculate days until expiry from contract expiry date
 * @param contract - The contract object
 * @returns Number of days until expiry (negative if expired, Infinity if no date)
 */
export const getDaysUntilExpiry = (contract: Contract): number => {
	// Always calculate from contractExpiryDate for real-time accuracy
	if (!contract.contractExpiryDate) {
		// If no expiry date, check if database has daysUntilExpiry as fallback
		if (
			contract.daysUntilExpiry !== undefined &&
			contract.daysUntilExpiry !== null
		) {
			return contract.daysUntilExpiry;
		}
		return Infinity;
	}

	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Parse date-only strings (YYYY-MM-DD) using local timezone to avoid timezone issues
		const expiryStr = contract.contractExpiryDate.split("T")[0];
		const [year, month, day] = expiryStr.split("-").map(Number);
		const expiry = new Date(year, month - 1, day);
		expiry.setHours(0, 0, 0, 0);

		const diffTime = expiry.getTime() - today.getTime();
		const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return days;
	} catch (error) {
		console.error("Error calculating days until expiry:", error);
		// Fallback to database value if calculation fails
		if (
			contract.daysUntilExpiry !== undefined &&
			contract.daysUntilExpiry !== null
		) {
			return contract.daysUntilExpiry;
		}
		return Infinity;
	}
};

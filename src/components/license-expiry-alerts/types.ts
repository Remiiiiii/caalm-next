/**
 * Shared types, constants, and utilities for license expiry alert components
 */

import {
	getLicenseExpiryRaw,
	isLicenseExpired,
	isLicenseExpiringWithinDays,
} from "@/lib/licenses/licensesListUtils";
import type { License } from "@/types/licenses";

export type { License };

export interface LicenseExpiryAlertsWidgetProps {
	className?: string;
	maxVisible?: number;
	showSettings?: boolean;
	compact?: boolean;
	licenses?: License[];
	/** Parent is still loading; skip self-fetch and show skeleton (trust empty []). */
	parentLoading?: boolean;
	/** When false, skip POST /api/contracts/update-expired (parent already did). */
	syncExpiredOnMount?: boolean;
	/** When false, stop and do not autoplay the looping expiry bell. */
	alarmEnabled?: boolean;
}

/**
 * Filter value constants (same buckets as contract expiry alerts)
 */
export const FILTER_VALUES = {
	EXPIRED: -1,
	THIRTY_DAYS: 30,
	SIXTY_DAYS: 60,
	NINETY_DAYS: 90,
	SIX_MONTHS: 180,
	ONE_YEAR: 365,
} as const;

export function isWidgetLicenseExpired(license: License): boolean {
	return isLicenseExpired(license);
}

/**
 * Match licenses metrics: Expired tab, or exclusive 30/60/90-day buckets.
 */
export function matchesWidgetLicenseExpiryFilter(
	license: License,
	filterDays: number,
): boolean {
	if (filterDays === FILTER_VALUES.EXPIRED) {
		return isLicenseExpired(license);
	}
	if (isLicenseExpired(license)) return false;

	if (filterDays === FILTER_VALUES.THIRTY_DAYS) {
		return isLicenseExpiringWithinDays(license, 30);
	}
	if (filterDays === FILTER_VALUES.SIXTY_DAYS) {
		return (
			isLicenseExpiringWithinDays(license, 60) &&
			!isLicenseExpiringWithinDays(license, 30)
		);
	}
	if (filterDays === FILTER_VALUES.NINETY_DAYS) {
		return (
			isLicenseExpiringWithinDays(license, 90) &&
			!isLicenseExpiringWithinDays(license, 60)
		);
	}
	if (filterDays === FILTER_VALUES.SIX_MONTHS) {
		return (
			isLicenseExpiringWithinDays(license, 180) &&
			!isLicenseExpiringWithinDays(license, 90)
		);
	}
	if (filterDays === FILTER_VALUES.ONE_YEAR) {
		return (
			isLicenseExpiringWithinDays(license, 365) &&
			!isLicenseExpiringWithinDays(license, 180)
		);
	}
	return isLicenseExpiringWithinDays(license, filterDays);
}

export const getEmptyStateMessage = (filterDays: number) => {
	if (filterDays === FILTER_VALUES.EXPIRED) {
		return {
			title: "No expired licenses",
			subtitle: "All licenses are active",
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
		title: `No licenses expiring ${periodText}`,
		subtitle: "All licenses are within safe periods",
	};
};

/** Always calculate from expiry date for real-time accuracy. */
export const getDaysUntilLicenseExpiry = (license: License): number => {
	const raw = getLicenseExpiryRaw(license);
	if (!raw) {
		if (
			license.daysUntilExpiry !== undefined &&
			license.daysUntilExpiry !== null
		) {
			return license.daysUntilExpiry;
		}
		return Infinity;
	}

	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const expiryStr = raw.split("T")[0];
		const [year, month, day] = expiryStr.split("-").map(Number);
		const expiry = new Date(year, month - 1, day);
		expiry.setHours(0, 0, 0, 0);
		const diffTime = expiry.getTime() - today.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	} catch {
		if (
			license.daysUntilExpiry !== undefined &&
			license.daysUntilExpiry !== null
		) {
			return license.daysUntilExpiry;
		}
		return Infinity;
	}
};

/** Shape useContractAlarm / CountdownTimer expect. */
export function licenseAsAlarmContract(license: License): {
	$id: string;
	contractName: string;
	contractExpiryDate?: string;
	daysUntilExpiry?: number;
} {
	return {
		$id: license.$id,
		contractName: license.licenseName || "Untitled license",
		contractExpiryDate: getLicenseExpiryRaw(license),
		daysUntilExpiry: license.daysUntilExpiry,
	};
}

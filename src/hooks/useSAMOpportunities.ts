// React Hook for SAM.gov Opportunities Integration with SWR
import { useCallback, useMemo, useState } from "react";
import useSWRMutation from "swr/mutation";
import type {
	RESPONSE_DEADLINE_OPTIONS,
	SAMContract,
	SAMSearchResponse,
} from "@/lib/sam-config";

export interface UseSAMOpportunitiesFilters {
	// Core search
	title?: string;
	keyword?: string; // Legacy support
	solnum?: string;
	noticeid?: string;

	// Classification and set-aside
	naicsCodes?: string[]; // Multiple NAICS codes for sector-based search
	naicsCode?: string; // Single NAICS code
	ccode?: string;
	setAsideType?: string;
	setAsideDescription?: string;

	// Procurement and dates
	procurementType?: string;
	responseDeadlineOption?: keyof typeof RESPONSE_DEADLINE_OPTIONS;
	postedFrom?: string;
	postedTo?: string;

	// Location and organization
	state?: string;
	zip?: string;
	organizationName?: string;
	organizationCode?: string;

	// Pagination
	limit?: number;
	/** SAM.gov page index (0-based), NOT a record skip. Page 2 => offset 1. */
	offset?: number;

	// Status
	status?: "active" | "inactive" | "archived" | "cancelled" | "deleted";
}

export interface UseSAMOpportunitiesResult {
	opportunities: SAMContract[];
	loading: boolean;
	error: string | null;
	totalRecords: number;
	currentPage: number;
	totalPages: number;
	searchOpportunities: (
		filters: UseSAMOpportunitiesFilters,
	) => Promise<SAMSearchResponse | undefined>;
	clearResults: () => void;
	hasSearched: boolean;
}

// SWR fetcher function for SAM opportunities using secure API route
const searchFetcher = async (
	_url: string,
	{ arg }: { arg: UseSAMOpportunitiesFilters },
): Promise<SAMSearchResponse> => {
	const response = await fetch("/api/sam/opportunities", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(arg),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `HTTP error! status: ${response.status}`,
		);
	}

	const result = await response.json();

	if (!result.success) {
		throw new Error(result.error || "Search failed");
	}

	return result.data;
};

function filtersCacheKey(filters: UseSAMOpportunitiesFilters): string {
	return JSON.stringify(filters);
}

/**
 * Enhanced React hook for searching SAM.gov opportunities with SWR caching
 * Implements debouncing, memoization, and fast data fetching
 */
export const useSAMOpportunities = (): UseSAMOpportunitiesResult => {
	const [hasSearched, setHasSearched] = useState(false);
	// Own copy of the last good page — SWR mutation `data` alone can briefly
	// go empty between page triggers; this keeps the list/total stable.
	const [lastResult, setLastResult] = useState<SAMSearchResponse | null>(null);
	const [searchCache, setSearchCache] = useState<
		Map<string, SAMSearchResponse>
	>(new Map());

	const {
		trigger,
		isMutating: loading,
		error: swrError,
	} = useSWRMutation("/api/sam-opportunities", searchFetcher, {
		revalidate: false,
	});

	const searchOpportunities = useCallback(
		async (filters: UseSAMOpportunitiesFilters) => {
			try {
				setHasSearched(true);

				const cacheKey = filtersCacheKey(filters);
				const cachedResult = searchCache.get(cacheKey);

				if (cachedResult) {
					setLastResult(cachedResult);
					return cachedResult;
				}

				const result = await trigger(filters);
				if (result) {
					setLastResult(result);
					setSearchCache((prev) => {
						const next = new Map(prev);
						next.set(cacheKey, result);
						return next;
					});
				}
				return result;
			} catch (err) {
				console.error("[CLIENT] useSAMOpportunities: search failed", err);
				throw err;
			}
		},
		[trigger, searchCache],
	);

	const clearResults = useCallback(() => {
		setHasSearched(false);
		setLastResult(null);
		setSearchCache(new Map());
	}, []);

	const memoizedValues = useMemo(() => {
		const opportunities = lastResult?.opportunities || [];
		const totalRecords = lastResult?.totalRecords || 0;
		const currentPage = lastResult?.page || 1;
		const pageSize = lastResult?.size || 25;
		const totalPages = Math.ceil(totalRecords / pageSize) || 0;

		return {
			opportunities,
			totalRecords,
			currentPage,
			totalPages,
		};
	}, [lastResult]);

	const error = swrError ? String(swrError) : null;

	return {
		...memoizedValues,
		loading,
		error,
		searchOpportunities,
		clearResults,
		hasSearched,
	};
};

/**
 * Helper hook for mapping your app's existing filter options to SAM.gov API parameters
 */
export const useSAMFilterMapping = () => {
	const mapResponseDeadlineToAPI = useCallback(
		(
			responseOption: string,
		): keyof typeof RESPONSE_DEADLINE_OPTIONS | undefined => {
			const mapping: Record<string, keyof typeof RESPONSE_DEADLINE_OPTIONS> = {
				Anytime: "Anytime",
				"Next Day": "Next Day",
				"Next 2 Days": "Next 2 Days",
				"Next 3 Days": "Next 3 Days",
				"Next Week": "Next Week",
				"Next Month": "Next Month",
				"Next 3 Months": "Next 3 Months",
				"Next Year": "Next Year",
			};

			return mapping[responseOption];
		},
		[],
	);

	const mapNAICSSectorToCodes = useCallback((sector: string): string[] => {
		const sectorMapping: Record<string, string[]> = {
			Agriculture: ["11"],
			Mining: ["21"],
			Utilities: ["22"],
			Construction: ["23"],
			Manufacturing: ["31", "32", "33"],
			"Wholesale Trade": ["42"],
			"Retail Trade": ["44", "45"],
			Transportation: ["48", "49"],
			Information: ["51"],
			Finance: ["52"],
			"Real Estate": ["53"],
			"Professional Services": ["54"],
			Management: ["55"],
			Administrative: ["56"],
			"Educational Services": ["61"],
			"Health Care": ["62"],
			Arts: ["71"],
			Accommodation: ["72"],
			"Other Services": ["81"],
			"Public Administration": ["92"],
		};

		return sectorMapping[sector] || [];
	}, []);

	return {
		mapResponseDeadlineToAPI,
		mapNAICSSectorToCodes,
	};
};

export default useSAMOpportunities;

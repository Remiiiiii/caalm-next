// React Hook for SAM.gov Opportunities Integration with SWR
import { useState, useCallback, useMemo } from 'react';
import useSWRMutation from 'swr/mutation';
import {
  SAMContract,
  SAMSearchResponse,
  RESPONSE_DEADLINE_OPTIONS,
} from '@/lib/sam-config';

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
  offset?: number;

  // Status
  status?: 'active' | 'inactive' | 'archived' | 'cancelled' | 'deleted';
}

export interface UseSAMOpportunitiesResult {
  opportunities: SAMContract[];
  loading: boolean;
  error: string | null;
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  searchOpportunities: (
    filters: UseSAMOpportunitiesFilters
  ) => Promise<SAMSearchResponse | undefined>;
  clearResults: () => void;
  hasSearched: boolean;
}

// SWR fetcher function for SAM opportunities using secure API route
const searchFetcher = async (
  url: string,
  { arg }: { arg: UseSAMOpportunitiesFilters }
): Promise<SAMSearchResponse> => {
  const response = await fetch('/api/sam/opportunities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `HTTP error! status: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Search failed');
  }

  return result.data;
};

/**
 * Enhanced React hook for searching SAM.gov opportunities with SWR caching
 * Implements debouncing, memoization, and fast data fetching
 */
export const useSAMOpportunities = (): UseSAMOpportunitiesResult => {
  const [hasSearched, setHasSearched] = useState(false);
  const [searchCache, setSearchCache] = useState<
    Map<string, SAMSearchResponse>
  >(new Map());

  // Use SWR mutation for search with caching
  const {
    trigger,
    isMutating: loading,
    error: swrError,
    data: searchResult,
  } = useSWRMutation('/api/sam-opportunities', searchFetcher, {
    revalidate: false, // Don't auto-revalidate search results
    onSuccess: (data, key, config) => {
      // Cache successful searches
      const cacheKey = JSON.stringify(config);
      setSearchCache((prev) => new Map(prev.set(cacheKey, data)));
    },
  });

  // Memoized search function with debouncing support
  const searchOpportunities = useCallback(
    async (filters: UseSAMOpportunitiesFilters) => {
      try {
        setHasSearched(true);

        // Check cache first for exact matches
        const cacheKey = JSON.stringify(filters);
        const cachedResult = searchCache.get(cacheKey);

        if (cachedResult) {
          // Return cached result immediately
          return cachedResult;
        }

        // Execute new search
        const result = await trigger(filters);
        return result;
      } catch (err) {
        console.error('Enhanced SAM search failed:', err);
        throw err;
      }
    },
    [trigger, searchCache]
  );

  const clearResults = useCallback(() => {
    setHasSearched(false);
    setSearchCache(new Map()); // Clear search cache
  }, []);

  // Memoized derived values for performance
  const memoizedValues = useMemo(() => {
    const opportunities = searchResult?.opportunities || [];
    const totalRecords = searchResult?.totalRecords || 0;
    const currentPage = searchResult?.page || 1;
    const totalPages = Math.ceil(totalRecords / 100) || 0;

    return {
      opportunities,
      totalRecords,
      currentPage,
      totalPages,
    };
  }, [searchResult]);

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
      responseOption: string
    ): keyof typeof RESPONSE_DEADLINE_OPTIONS | undefined => {
      // Map your existing response deadline options to SAM API format
      const mapping: Record<string, keyof typeof RESPONSE_DEADLINE_OPTIONS> = {
        Anytime: 'Anytime',
        'Next Day': 'Next Day',
        'Next 2 Days': 'Next 2 Days',
        'Next 3 Days': 'Next 3 Days',
        'Next Week': 'Next Week',
        'Next Month': 'Next Month',
        'Next 3 Months': 'Next 3 Months',
        'Next Year': 'Next Year',
      };

      return mapping[responseOption];
    },
    []
  );

  const mapNAICSSectorToCodes = useCallback((sector: string): string[] => {
    // Map NAICS sectors to actual NAICS codes
    // This would integrate with your existing NAICS sector data
    const sectorMapping: Record<string, string[]> = {
      Agriculture: ['11'], // Agriculture, Forestry, Fishing and Hunting
      Mining: ['21'], // Mining, Quarrying, and Oil and Gas Extraction
      Utilities: ['22'], // Utilities
      Construction: ['23'], // Construction
      Manufacturing: ['31', '32', '33'], // Manufacturing
      'Wholesale Trade': ['42'], // Wholesale Trade
      'Retail Trade': ['44', '45'], // Retail Trade
      Transportation: ['48', '49'], // Transportation and Warehousing
      Information: ['51'], // Information
      Finance: ['52'], // Finance and Insurance
      'Real Estate': ['53'], // Real Estate and Rental and Leasing
      'Professional Services': ['54'], // Professional, Scientific, and Technical Services
      Management: ['55'], // Management of Companies and Enterprises
      Administrative: ['56'], // Administrative and Support and Waste Management
      'Educational Services': ['61'], // Educational Services
      'Health Care': ['62'], // Health Care and Social Assistance
      Arts: ['71'], // Arts, Entertainment, and Recreation
      Accommodation: ['72'], // Accommodation and Food Services
      'Other Services': ['81'], // Other Services (except Public Administration)
      'Public Administration': ['92'], // Public Administration
    };

    return sectorMapping[sector] || [];
  }, []);

  return {
    mapResponseDeadlineToAPI,
    mapNAICSSectorToCodes,
  };
};

export default useSAMOpportunities;

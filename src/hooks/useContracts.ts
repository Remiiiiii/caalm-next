import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { SAMSearchResponse, SAMContractSearchParams } from '@/lib/sam-config';

// Fetcher function for GET requests
const fetcher = async (
  url: string
): Promise<{ success: boolean; data: SAMSearchResponse; error?: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Fetcher function for POST requests (search with body)
const searchFetcher = async (
  url: string,
  { arg }: { arg: Omit<SAMContractSearchParams, 'api_key'> }
): Promise<{ success: boolean; data: SAMSearchResponse; error?: string }> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Hook for fetching contracts with GET request (simpler, cached by URL)
 */
export function useContracts(
  params?: Omit<SAMContractSearchParams, 'api_key'>
) {
  // Build query string from parameters
  const queryParams = new URLSearchParams();
  if (params?.keyword) queryParams.append('keyword', params.keyword);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.noticeType) queryParams.append('noticeType', params.noticeType);
  if (params?.setAside) queryParams.append('setAside', params.setAside);
  if (params?.naicsCode) queryParams.append('naicsCode', params.naicsCode);
  if (params?.postedFrom) queryParams.append('postedFrom', params.postedFrom);
  if (params?.postedTo) queryParams.append('postedTo', params.postedTo);
  if (params?.state) queryParams.append('state', params.state);
  if (params?.dept) queryParams.append('dept', params.dept);

  const url = params ? `/api/contracts?${queryParams.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // Cache for 1 minute
    errorRetryCount: 3,
    errorRetryInterval: 1000,
  });

  return {
    contracts: data?.data?.opportunities || [],
    totalRecords: data?.data?.totalRecords || 0,
    page: data?.data?.page || 1,
    size: data?.data?.size || 25,
    loading: isLoading,
    error: error || (data && !data.success ? data.error : null),
    mutate,
  };
}

/**
 * Hook for contract search with POST request (better for complex searches)
 */
export function useContractSearch() {
  const { trigger, isMutating, error, data } = useSWRMutation(
    '/api/contracts',
    searchFetcher,
    {
      revalidate: false, // Don't auto-revalidate search results
    }
  );

  const searchContracts = async (
    params: Omit<SAMContractSearchParams, 'api_key'>
  ) => {
    try {
      const result = await trigger(params);
      return result;
    } catch (err) {
      console.error('Contract search error:', err);
      throw err;
    }
  };

  return {
    searchContracts,
    contracts: data?.data?.opportunities || [],
    totalRecords: data?.data?.totalRecords || 0,
    page: data?.data?.page || 1,
    size: data?.data?.size || 25,
    loading: isMutating,
    error: error || (data && !data.success ? data.error : null),
  };
}

/**
 * Hook for getting contract details by ID
 */
export function useContractDetails(contractId?: string) {
  const url = contractId ? `/api/contracts/${contractId}` : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // Cache for 5 minutes
  });

  return {
    contract: data?.data || null,
    loading: isLoading,
    error: error || (data && !data.success ? data.error : null),
    mutate,
  };
}

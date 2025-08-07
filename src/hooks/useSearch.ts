import useSWR, { mutate } from 'swr';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// interface SearchResult {
//   $id: string;
//   type: 'file' | 'contract' | 'user' | 'notification';
//   title: string;
//   description: string;
//   url: string;
//   relevance: number;
//   createdAt: string;
// }

interface SearchFilters {
  type?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  department?: string;
  status?: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch search results');
  }
  return response.json();
};

export const useSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Build search URL
  const searchUrl = useMemo(() => {
    if (!debouncedQuery.trim()) return null;

    const params = new URLSearchParams({
      q: debouncedQuery,
      userId: user?.$id || '',
    });

    if (filters.type?.length) {
      params.append('type', filters.type.join(','));
    }
    if (filters.dateRange?.start) {
      params.append('startDate', filters.dateRange.start);
    }
    if (filters.dateRange?.end) {
      params.append('endDate', filters.dateRange.end);
    }
    if (filters.department) {
      params.append('department', filters.department);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }

    return `/api/search?${params.toString()}`;
  }, [debouncedQuery, filters, user?.$id]);

  // Search results
  const {
    data: searchResults,
    error,
    isLoading,
  } = useSWR(searchUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute deduping
    onSuccess: () => setIsSearching(false),
    onError: () => setIsSearching(false),
  });

  // Recent searches
  const { data: recentSearches } = useSWR(
    user?.$id ? `/api/search/recent?userId=${user.$id}` : null,
    fetcher
  );

  // Search suggestions
  const { data: suggestions } = useSWR(
    debouncedQuery.length >= 2
      ? `/api/search/suggestions?q=${debouncedQuery}`
      : null,
    fetcher,
    {
      dedupingInterval: 300000, // 5 minutes for suggestions
    }
  );

  // Search stats
  const { data: searchStats } = useSWR(
    searchUrl
      ? `/api/search/stats?${new URLSearchParams({ q: debouncedQuery })}`
      : null,
    fetcher
  );

  // Perform search
  const performSearch = async (
    searchQuery: string,
    searchFilters?: SearchFilters
  ) => {
    setIsSearching(true);
    setQuery(searchQuery);
    if (searchFilters) {
      setFilters(searchFilters);
    }
  };

  // Save search to history
  const saveSearch = async (searchQuery: string) => {
    try {
      await fetch('/api/search/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          userId: user?.$id,
          timestamp: new Date().toISOString(),
        }),
      });

      // Refresh recent searches
      mutate(`/api/search/recent?userId=${user?.$id}`);
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  // Clear search history
  const clearSearchHistory = async () => {
    try {
      await fetch(`/api/search/history?userId=${user?.$id}`, {
        method: 'DELETE',
      });

      mutate(`/api/search/recent?userId=${user?.$id}`);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  return {
    // State
    query,
    setQuery,
    filters,
    setFilters,
    isSearching,

    // Data
    results: searchResults?.data || [],
    recentSearches: recentSearches?.data || [],
    suggestions: suggestions?.data || [],
    stats: searchStats?.data || {
      total: 0,
      files: 0,
      contracts: 0,
      users: 0,
    },

    // Loading states
    isLoading: isLoading || isSearching,
    isLoadingResults: isLoading,
    isLoadingSuggestions: suggestions?.isLoading,

    // Errors
    error,

    // Actions
    performSearch,
    saveSearch,
    clearSearchHistory,
  };
};

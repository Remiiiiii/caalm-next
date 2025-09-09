import useSWR, { mutate } from 'swr';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { performAdvancedSearch, getSearchSuggestions, getRecentSearches, saveSearch, getSavedSearches, deleteSavedSearch, AdvancedSearchFilters } from '@/lib/actions/search.actions';

interface SearchResult {
  id: string;
  type: 'contract' | 'file';
  name: string;
  contractName?: string;
  vendor?: string;
  department?: string;
  status?: string;
  priority?: string;
  amount?: number;
  contractExpiryDate?: string;
  assignedManagers?: string[];
  $createdAt: string;
  $updatedAt: string;
  searchScore: number;
}

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

  // Search results using the new advanced search
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim() && user?.$id) {
      performSearch(debouncedQuery, filters);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedQuery, user?.$id]);

  const performSearch = async (searchQuery: string, searchFilters: SearchFilters) => {
    setIsSearching(true);
    setIsLoading(true);
    setError(null);

    try {
      const advancedFilters: AdvancedSearchFilters = {
        type: searchFilters.type,
        startDate: searchFilters.dateRange?.start,
        endDate: searchFilters.dateRange?.end,
        department: searchFilters.department,
        status: searchFilters.status,
      };

      const results = await performAdvancedSearch({
        query: searchQuery,
        userId: user?.$id || '',
        filters: advancedFilters,
        limit: 10, // Limit for quick search
      });

      setSearchResults(results.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  };

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    if (user?.$id) {
      getRecentSearches(user.$id, 5).then(setRecentSearches);
    }
  }, [user?.$id]);

  // Load suggestions when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      getSearchSuggestions(debouncedQuery).then(setSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  // Save search to history
  const saveSearchToHistory = async (searchQuery: string) => {
    if (!user?.$id) return;
    
    try {
      // The search is automatically saved in the performAdvancedSearch function
      // Refresh recent searches
      const recent = await getRecentSearches(user.$id, 5);
      setRecentSearches(recent);
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  // Clear search history
  const clearSearchHistory = async () => {
    // This would need to be implemented in the search actions
    console.log('Clear search history not implemented yet');
  };

  return {
    // State
    query,
    setQuery,
    filters,
    setFilters,
    isSearching,

    // Data
    results: searchResults,
    searchResults: searchResults,
    recentSearches,
    suggestions,
    stats: {
      total: searchResults.length,
      files: searchResults.filter(r => r.type === 'file').length,
      contracts: searchResults.filter(r => r.type === 'contract').length,
      users: 0,
    },

    // Loading states
    isLoading: isLoading || isSearching,
    isLoadingResults: isLoading,
    isLoadingSuggestions: false,

    // Errors
    error,

    // Actions
    performSearch: (searchQuery: string, searchFilters?: SearchFilters) => {
      setQuery(searchQuery);
      if (searchFilters) {
        setFilters(searchFilters);
      }
    },
    saveSearch: saveSearchToHistory,
    clearSearchHistory,
  };
};

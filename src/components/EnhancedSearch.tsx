'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Clock,
  TrendingUp,
  Filter,
  Save,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSearchSuggestions,
  logSearchAnalytics,
  getSearchAnalytics,
  performAdvancedSearch,
  AdvancedSearchFilters,
} from '@/lib/actions/search.actions';

interface EnhancedSearchProps {
  onResults: (results: any[]) => void;
  onClose?: () => void;
  initialQuery?: string;
  initialFilters?: AdvancedSearchFilters;
  showAnalytics?: boolean;
}

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'suggestion' | 'trending';
  count?: number;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onResults,
  onClose,
  initialQuery = '',
  initialFilters = {},
  showAnalytics = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchTime, setSearchTime] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchStartTime = useRef<number>(0);

  // Load search history and analytics on mount
  useEffect(() => {
    if (user?.$id) {
      loadSearchHistory();
      if (showAnalytics) {
        loadAnalytics();
      }
    }
  }, [user?.$id, showAnalytics]);

  // Load suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      loadSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const loadSearchHistory = async () => {
    try {
      const history = localStorage.getItem(`search_history_${user?.$id}`);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!user?.$id) return;

    try {
      const analyticsData = await getSearchAnalytics(user.$id, 30);
      setAnalytics(analyticsData?.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const loadSuggestions = async (searchQuery: string) => {
    try {
      const [apiSuggestions, recentSearches] = await Promise.all([
        getSearchSuggestions(searchQuery, 5),
        Promise.resolve(searchHistory.slice(0, 3)),
      ]);

      const suggestionList: SearchSuggestion[] = [
        ...recentSearches
          .filter((search) =>
            search.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((search) => ({ text: search, type: 'recent' as const })),
        ...apiSuggestions
          .filter((suggestion) => !recentSearches.includes(suggestion))
          .map((suggestion) => ({
            text: suggestion,
            type: 'suggestion' as const,
          })),
      ];

      // Add trending searches from analytics
      if (analytics?.topSearches) {
        const trending = analytics.topSearches
          .slice(0, 2)
          .filter(
            (trend: any) =>
              trend.query.toLowerCase().includes(searchQuery.toLowerCase()) &&
              !suggestionList.some((s) => s.text === trend.query)
          )
          .map((trend: any) => ({
            text: trend.query,
            type: 'trending' as const,
            count: trend.count,
          }));

        suggestionList.push(...trending);
      }

      setSuggestions(suggestionList.slice(0, 8));
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const saveToHistory = (searchQuery: string) => {
    if (!user?.$id || !searchQuery.trim()) return;

    try {
      const history = searchHistory.filter((item) => item !== searchQuery);
      const newHistory = [searchQuery, ...history].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem(
        `search_history_${user.$id}`,
        JSON.stringify(newHistory)
      );
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const handleSearch = async (searchQuery: string = query) => {
    console.log('handleSearch called with:', {
      searchQuery,
      user: user?.$id,
      query,
    });

    if (!searchQuery.trim()) {
      console.log('No search query provided');
      return;
    }

    // Note: Search can work without authentication, but analytics won't be tracked
    if (!user?.$id) {
      console.log('No user ID found - search will work but without analytics');
    }

    setIsSearching(true);
    setShowSuggestions(false);
    searchStartTime.current = Date.now();

    try {
      const results = await performAdvancedSearch({
        query: searchQuery,
        userId: user?.$id || 'anonymous',
        filters: initialFilters,
        limit: 25,
      });

      const endTime = Date.now();
      const searchDuration = endTime - searchStartTime.current;
      setSearchTime(searchDuration);

      // Log analytics - only if user is authenticated
      if (user?.$id) {
        await logSearchAnalytics({
          userId: user.$id,
          query: searchQuery,
          filters: initialFilters,
          resultCount: results.results.length,
          searchTime: searchDuration,
        });
      }

      // Save to history - only if user is authenticated
      if (user?.$id) {
        saveToHistory(searchQuery);
      }

      console.log('Search completed successfully:', {
        resultCount: results.results.length,
        searchDuration,
        results: results.results,
      });

      onResults(results.results);

      toast({
        title: 'Search Complete',
        description: `Found ${results.results.length} results in ${searchDuration}ms`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: 'Please try again with different terms',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch(suggestion.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onResults([]);
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search contracts, vendors, departments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          className="pl-10 pr-20 h-12 text-lg"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => handleSearch()}
            disabled={isSearching || !query.trim()}
            size="sm"
            className="h-8"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto">
          <CardContent className="p-0">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {getSuggestionIcon(suggestion.type)}
                <span className="flex-1">{suggestion.text}</span>
                {suggestion.type === 'trending' && suggestion.count && (
                  <Badge variant="secondary" className="text-xs">
                    {suggestion.count} searches
                  </Badge>
                )}
                {suggestion.type === 'recent' && (
                  <Badge variant="outline" className="text-xs">
                    Recent
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search Analytics */}
      {showAnalytics && analytics && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Search Analytics (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.totalSearches}
                </div>
                <div className="text-sm text-gray-600">Total Searches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(analytics.averageSearchTime)}ms
                </div>
                <div className="text-sm text-gray-600">Avg Search Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.topSearches?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Unique Queries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.topFilters?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Filter Types Used</div>
              </div>
            </div>

            {analytics.topSearches?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Popular Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.topSearches
                    .slice(0, 5)
                    .map((search: any, index: number) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        {search.query} ({search.count})
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Performance */}
      {searchTime > 0 && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          Search completed in {searchTime}ms
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;

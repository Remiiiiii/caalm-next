'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Save, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  performAdvancedSearch,
  getSearchSuggestions,
  getRecentSearches,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  AdvancedSearchFilters,
  SearchResult,
} from '@/lib/actions/search.actions';
import { format } from 'date-fns';

interface RecentSearch {
  query: string;
  timestamp: string;
  resultCount: number;
}

interface SavedSearch {
  $id: string;
  name: string;
  query: string;
  filters: AdvancedSearchFilters;
  createdAt: string;
}

interface AdvancedSearchProps {
  onResults?: (results: SearchResult[]) => void;
  onClose?: () => void;
  initialQuery?: string;
  initialFilters?: AdvancedSearchFilters;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onResults,
  onClose,
  initialQuery = '',
  initialFilters = {},
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);

  // Date picker states
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [expiryStartDate, setExpiryStartDate] = useState<Date | undefined>();
  const [expiryEndDate, setExpiryEndDate] = useState<Date | undefined>();

  // Load recent and saved searches on mount
  useEffect(() => {
    if (user?.$id) {
      loadRecentSearches();
      loadSavedSearches();
    }
  }, [user?.$id]);

  // Load suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const loadRecentSearches = async () => {
    if (!user?.$id) return;
    try {
      const recent = await getRecentSearches(user.$id, 5);
      setRecentSearches(recent);
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const loadSavedSearches = async () => {
    if (!user?.$id) return;
    try {
      const saved = await getSavedSearches(user.$id);
      setSavedSearches(saved);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const suggestions = await getSearchSuggestions(query);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      toast({
        title: 'Search Error',
        description: 'Please enter a search query or apply filters',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchFilters = {
        ...filters,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        expiryDateStart: expiryStartDate
          ? expiryStartDate.toISOString()
          : undefined,
        expiryDateEnd: expiryEndDate ? expiryEndDate.toISOString() : undefined,
      };

      const searchResults = await performAdvancedSearch({
        query,
        userId: user?.$id || '',
        filters: searchFilters,
      });

      setResults(searchResults.results);
      onResults?.(searchResults.results);

      toast({
        title: 'Search Complete',
        description: `Found ${searchResults.results.length} results`,
      });
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Search Failed',
        description: 'An error occurred while searching',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Save Search Error',
        description: 'Please enter a search query to save',
        variant: 'destructive',
      });
      return;
    }

    const searchName = prompt('Enter a name for this search:');
    if (!searchName) return;

    try {
      await saveSearch({
        userId: user?.$id || '',
        name: searchName,
        query,
        filters,
      });

      toast({
        title: 'Search Saved',
        description: `"${searchName}" has been saved`,
      });

      loadSavedSearches();
    } catch (error) {
      console.error('Failed to save search:', error);
      toast({
        title: 'Save Failed',
        description:
          error instanceof Error ? error.message : 'Failed to save search',
        variant: 'destructive',
      });
    }
  };

  const handleLoadSavedSearch = (savedSearch: SavedSearch) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters || {});
    setShowSavedSearches(false);
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    try {
      await deleteSavedSearch(searchId, user?.$id || '');
      toast({
        title: 'Search Deleted',
        description: 'Saved search has been deleted',
      });
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to delete saved search:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete saved search',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setFilters({});
    setStartDate(undefined);
    setEndDate(undefined);
    setExpiryStartDate(undefined);
    setExpiryEndDate(undefined);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.type?.length) count++;
    if (filters.department) count++;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.vendor) count++;
    if (filters.contractType) count++;
    if (filters.amountMin !== undefined) count++;
    if (filters.amountMax !== undefined) count++;
    if (startDate) count++;
    if (endDate) count++;
    if (expiryStartDate) count++;
    if (expiryEndDate) count++;
    return count;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      {/* Search Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contracts, files, vendors, departments..."
            className="pl-10 pr-4"
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => {
                    setQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>

        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Filters</h4>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>

              <Separator />

              {/* Type Filter */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={filters.type?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      type: value ? [value] : undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contracts</SelectItem>
                    <SelectItem value="file">Files</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={filters.department || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      department: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Administration">
                      Administration
                    </SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={filters.priority || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      priority: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor Filter */}
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  value={filters.vendor || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      vendor: e.target.value || undefined,
                    }))
                  }
                  placeholder="Search by vendor name"
                />
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Amount Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min amount"
                    value={filters.amountMin || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        amountMin: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max amount"
                    value={filters.amountMax || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        amountMax: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Created Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        {startDate
                          ? format(startDate, 'MMM dd, yyyy')
                          : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        {endDate ? format(endDate, 'MMM dd, yyyy') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Expiry Date Range */}
              <div className="space-y-2">
                <Label>Expiry Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        {expiryStartDate
                          ? format(expiryStartDate, 'MMM dd, yyyy')
                          : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expiryStartDate}
                        onSelect={setExpiryStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        {expiryEndDate
                          ? format(expiryEndDate, 'MMM dd, yyyy')
                          : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={expiryEndDate}
                        onSelect={setExpiryEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={handleSaveSearch}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>

        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Recent and Saved Searches */}
      <div className="flex gap-2">
        {recentSearches.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Recent
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Recent Searches</h4>
                {recentSearches.map((search, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => {
                      setQuery(search.query);
                      setShowFilters(false);
                    }}
                  >
                    <div className="font-medium">{search.query}</div>
                    <div className="text-sm text-gray-500">
                      {search.resultCount} results •{' '}
                      {new Date(search.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {savedSearches.length > 0 && (
          <Popover open={showSavedSearches} onOpenChange={setShowSavedSearches}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Saved
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Saved Searches</h4>
                {savedSearches.map((search) => (
                  <div
                    key={search.$id}
                    className="p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => handleLoadSavedSearch(search)}
                      >
                        <div className="font-medium">{search.name}</div>
                        <div className="text-sm text-gray-500">
                          {search.query}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSavedSearch(search.$id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            result.type === 'contract' ? 'default' : 'secondary'
                          }
                        >
                          {result.type}
                        </Badge>
                        <h3 className="font-medium">{result.name}</h3>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        {result.vendor && (
                          <div>
                            <span className="font-medium">Vendor:</span>{' '}
                            {result.vendor}
                          </div>
                        )}
                        {result.department && (
                          <div>
                            <span className="font-medium">Department:</span>{' '}
                            {result.department}
                          </div>
                        )}
                        {result.status && (
                          <div>
                            <span className="font-medium">Status:</span>{' '}
                            {result.status}
                          </div>
                        )}
                        {result.priority && (
                          <div>
                            <span className="font-medium">Priority:</span>{' '}
                            {result.priority}
                          </div>
                        )}
                        {result.amount && (
                          <div>
                            <span className="font-medium">Amount:</span> $
                            {result.amount.toLocaleString()}
                          </div>
                        )}
                        {result.contractExpiryDate && (
                          <div>
                            <span className="font-medium">Expires:</span>{' '}
                            {new Date(
                              result.contractExpiryDate
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <div>
                        Created:{' '}
                        {new Date(result.$createdAt).toLocaleDateString()}
                      </div>
                      <div>Score: {result.searchScore}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedSearch;

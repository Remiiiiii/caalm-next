'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Clock,
  FileText,
  Building2,
  Users,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { performAdvancedSearch } from '@/lib/actions/search.actions';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: string;
  searchScore?: number;
  $createdAt: string;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Focus input when modal opens and reset state
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Reset to original UI when modal opens
      setShowResults(false);
      setQuery('');
    }
  }, [isOpen]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle search
  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    try {
      const results = await performAdvancedSearch({
        query: searchQuery,
        userId: user?.$id || 'anonymous',
        filters: {},
        limit: 10,
      });

      setSearchResults(results.results);

      // Save to recent searches
      const newRecentSearches = [
        searchQuery,
        ...recentSearches.filter((s) => s !== searchQuery),
      ].slice(0, 5);
      setRecentSearches(newRecentSearches);
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle quick search actions
  const handleQuickSearch = async (action: string) => {
    setIsSearching(true);
    setShowResults(true);
    setSearchResults([]);

    try {
      // Get user info for role-based filtering
      const userRole = user?.role || 'user';
      const userDepartment = user?.department;

      const response = await fetch(
        `/api/search/quick?type=${action}&userId=${
          user?.$id || 'anonymous'
        }&userRole=${userRole}&userDepartment=${userDepartment || ''}&limit=25`
      );

      if (!response.ok) {
        throw new Error('Quick search failed');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Quick search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle delete recent searches
  const handleDeleteRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Reset modal state when closing
  const handleClose = () => {
    setShowResults(false);
    setQuery('');
    setSearchResults([]);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
      {/* Modal */}
      <Card className="w-[500px] max-w-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="sidebar-gradient-text">Search</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <span className="sr-only">Close</span>×
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search contracts, vendors, departments..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-4 py-3 text-base border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Ctrl+K
              </span>
            </div>
          </div>

          {/* Content */}
          {!showResults ? (
            <div className="space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-slate-700">
                      Recent Searches:
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteRecentSearches}
                      className="h-6 px-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(search);
                          handleSearch(search);
                        }}
                        className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-slate-50 text-sm text-slate-600"
                      >
                        <Clock className="h-3 w-3 text-gray-400" />
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Search */}
              <div className="mb-2 text-sm text-slate-700">Quick Search:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickSearch('all-contracts')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>All Contracts</span>
                </button>

                <button
                  onClick={() => handleQuickSearch('vendors')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600"
                >
                  <Building2 className="h-4 w-4 text-green-600" />
                  <span>Vendors</span>
                </button>

                <button
                  onClick={() => handleQuickSearch('departments')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600"
                >
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Departments</span>
                </button>

                <button
                  onClick={() => handleQuickSearch('active')}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600"
                >
                  <Filter className="h-4 w-4 text-orange-600" />
                  <span>Active</span>
                </button>
              </div>
            </div>
          ) : (
            /* Search Results */
            <div>
              <div className="mb-2 text-sm text-slate-700">
                Search Results ({searchResults.length}):
              </div>

              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-slate-500 mt-2">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-white/30 mb-4">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="text-center px-2 py-1 text-[14px] font-semibold text-slate-700">
                          {searchResults[0]?.type === 'department'
                            ? 'Department'
                            : searchResults[0]?.type === 'vendor'
                            ? 'Vendor'
                            : 'Name'}
                        </th>
                        <th className="text-center px-2 py-1 text-[14px] font-semibold text-slate-700">
                          Department
                        </th>
                        <th className="text-center px-2 py-1 text-[14px] font-semibold text-slate-700">
                          Type
                        </th>
                        <th className="text-center px-2 py-1 text-[14px] font-semibold text-slate-700">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 text-sm">
                      {searchResults.map((result) => (
                        <tr
                          key={result.id}
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => {
                            if (
                              result.type === 'contract' ||
                              result.type === 'file'
                            ) {
                              router.push(`/contracts/${result.id}`);
                              handleClose();
                            }
                            // For department and vendor types, we could show more details or navigate differently
                          }}
                        >
                          <td className="text-center px-2 py-1">
                            {result.name}
                          </td>
                          <td className="text-center px-2 py-1">
                            {result.department || '-'}
                          </td>
                          <td className="text-center px-2 py-1 capitalize">
                            {result.contractType || result.type}
                          </td>
                          <td className="text-center px-2 py-1">
                            {result.searchScore
                              ? Math.round(result.searchScore)
                              : 100}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No results found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SearchModal;

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  ExternalLink,
  Calendar,
  Building2,
  DollarSign,
  MapPin,
  FileText,
  AlertCircle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  useSAMOpportunities,
  UseSAMOpportunitiesFilters,
} from '@/hooks/useSAMOpportunities';
import {
  SAMContract,
  NOTICE_TYPES,
  SET_ASIDE_CODES,
  formatContractAmount,
  formatContractDate,
  getContractTypeDisplay,
  getSetAsideDisplay,
  RESPONSE_DEADLINE_OPTIONS,
} from '@/lib/sam-config';
import ContractDocumentViewer from '@/components/ContractDocumentViewer';

interface ContractCardProps {
  contract: SAMContract;
  onViewDocument?: (contract: SAMContract) => void;
}

const ContractCard = ({ contract, onViewDocument }: ContractCardProps) => {
  const handleCardClick = () => {
    if (!onViewDocument) return;
    onViewDocument(contract);
  };

  return (
    <Card
      className="bg-white/30 backdrop-blur border border-white/40 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:border-blue-300 hover:bg-white/40"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold sidebar-gradient-text leading-tight mb-2">
              {contract.title}
            </CardTitle>
            {contract.solicitationNumber && (
              <p className="text-sm text-slate-600 font-mono">
                Notice ID: {contract.solicitationNumber}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant="outline" className="text-xs">
              {getContractTypeDisplay(contract.type)}
            </Badge>
            {contract.typeOfSetAside && (
              <Badge variant="secondary" className="text-xs">
                {getSetAsideDisplay(contract.typeOfSetAside)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Agency Information */}
        {(contract.department || contract.office) && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4" />
            <span>
              {[contract.department, contract.subTier, contract.office]
                .filter(Boolean)
                .join(' • ')}
            </span>
          </div>
        )}

        {/* Description */}
        {contract.description && (
          <p className="text-sm text-slate-700 line-clamp-3">
            {contract.description}
          </p>
        )}

        {/* Key Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>Posted: {formatContractDate(contract.postedDate)}</span>
          </div>
          {contract.responseDeadLine && (
            <div className="flex items-center gap-2 text-slate-600">
              <AlertCircle className="h-4 w-4" />
              <span>Due: {formatContractDate(contract.responseDeadLine)}</span>
            </div>
          )}
        </div>

        {/* Award Information */}
        {contract.award && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-green-800 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Award Information</span>
            </div>
            {contract.award.amount && (
              <p className="text-sm text-green-700">
                Amount: {formatContractAmount(contract.award.amount)}
              </p>
            )}
            {contract.award.awardee?.name && (
              <p className="text-sm text-green-700">
                Awardee: {contract.award.awardee.name}
              </p>
            )}
            {contract.award.date && (
              <p className="text-sm text-green-700">
                Date: {formatContractDate(contract.award.date)}
              </p>
            )}
          </div>
        )}

        {/* Location */}
        {contract.placeOfPerformance && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4" />
            <span>
              {[
                contract.placeOfPerformance.city?.name,
                contract.placeOfPerformance.state?.name,
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}

        {/* NAICS Code */}
        {contract.naicsCode && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="h-4 w-4" />
            <span>
              NAICS: {contract.naicsCode}
              {contract.naicsDescription && ` - ${contract.naicsDescription}`}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            {contract.uiLink && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(contract.uiLink, '_blank');
                }}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                SAM.gov
              </Button>
            )}
            {contract.additionalInfoLink && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(contract.additionalInfoLink, '_blank');
                }}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Details
              </Button>
            )}
          </div>

          {/* Click indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Eye className="h-4 w-4" />
            <span>Click to view PDF</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ContractsDisplay() {
  // Enhanced search parameters with new SAM.gov API features
  const [searchFilters, setSearchFilters] =
    useState<UseSAMOpportunitiesFilters>({
      keyword: '',
      procurementType: '',
      setAsideType: '',
      state: '',
      organizationName: '',
      responseDeadlineOption: 'Anytime',
      limit: 25,
      offset: 0,
    });

  // Document Viewer State
  const [selectedContract, setSelectedContract] = useState<SAMContract | null>(
    null
  );
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  // Use the new SAM opportunities hook with SWR caching
  const {
    opportunities: contracts,
    loading,
    error,
    totalRecords,
    currentPage,
    totalPages,
    searchOpportunities,
    clearResults,
    hasSearched,
  } = useSAMOpportunities();

  // Debounced search function following best practices
  const handleSearch = useCallback(async () => {
    try {
      // Filter out empty and default values
      const cleanFilters: UseSAMOpportunitiesFilters = Object.fromEntries(
        Object.entries(searchFilters).filter(([key, value]) => {
          if (typeof value === 'string') {
            return value !== '' && value !== 'all';
          }
          if (typeof value === 'number') {
            return key === 'limit' || key === 'offset' || value > 0;
          }
          return value !== null && value !== undefined;
        })
      ) as UseSAMOpportunitiesFilters;

      // Execute search with enhanced filters
      await searchOpportunities(cleanFilters);
    } catch (err) {
      console.error('Enhanced SAM search failed:', err);
    }
  }, [searchFilters, searchOpportunities]);

  // Auto-search when user stops typing (debounced)
  useEffect(() => {
    if (searchFilters.keyword && searchFilters.keyword.length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500); // 500ms debounce for better UX

      return () => clearTimeout(timeoutId);
    }
  }, [searchFilters.keyword, handleSearch]);

  const handleReset = useCallback(() => {
    setSearchFilters({
      keyword: '',
      procurementType: '',
      setAsideType: '',
      state: '',
      organizationName: '',
      responseDeadlineOption: 'Anytime',
      limit: 25,
      offset: 0,
    });
    clearResults();
  }, [clearResults]);

  const loadMore = useCallback(async () => {
    const currentOffset = searchFilters.offset || 0;
    const currentLimit = searchFilters.limit || 25;

    const newFilters = {
      ...searchFilters,
      offset: currentOffset + currentLimit,
    };
    setSearchFilters(newFilters);

    // Search with updated pagination
    await searchOpportunities(newFilters);
  }, [searchFilters, searchOpportunities]);

  // Document Viewer Handlers
  const handleViewDocument = useCallback((contract: SAMContract) => {
    setSelectedContract(contract);
    setShowDocumentViewer(true);
  }, []);

  const handleCloseDocumentViewer = useCallback(() => {
    setShowDocumentViewer(false);
    setSelectedContract(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Advanced Resources
          </h1>
          <p className="text-slate-600 mt-1">
            Search and explore government contract opportunities from SAM.gov
          </p>
        </div>
      </div>

      {/* Search Form */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 sidebar-gradient-text">
            <Search className="h-5 w-5" />
            Search Contracts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                placeholder="Enter search terms... (auto-search after 2+ chars)"
                value={searchFilters.keyword}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    keyword: e.target.value,
                  }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <Label htmlFor="procurementType">Procurement Type</Label>
              <Select
                value={searchFilters.procurementType || 'all'}
                onValueChange={(value) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    procurementType: value === 'all' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(NOTICE_TYPES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="setAside">Set-Aside Type</Label>
              <Select
                value={searchFilters.setAsideType || 'all'}
                onValueChange={(value) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    setAsideType: value === 'all' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Set-Asides" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Set-Asides</SelectItem>
                  {Object.entries(SET_ASIDE_CODES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="e.g., FL, CA, TX"
                value={searchFilters.state}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    state: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                placeholder="e.g., GSA, Defense, Agriculture"
                value={searchFilters.organizationName}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    organizationName: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="responseDeadline">Response Due</Label>
              <Select
                value={searchFilters.responseDeadlineOption}
                onValueChange={(value) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    responseDeadlineOption:
                      value as keyof typeof RESPONSE_DEADLINE_OPTIONS,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anytime" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(RESPONSE_DEADLINE_OPTIONS).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search Contracts
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Error Display with Setup Instructions */}
      {error && (
        <div className="space-y-4">
          <Card className="bg-red-50 border border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800 mb-3">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error loading contracts</span>
              </div>
              <p className="text-red-700 mb-3">
                {error || 'An unknown error occurred'}
              </p>

              {/* Show setup instructions if API key is missing */}
              {error?.includes('API key') && (
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">
                    SAM.gov API Key Setup Required
                  </h4>
                  <p className="text-sm text-red-700 mb-3">
                    To use SAM.gov contract search, you need an API key:
                  </p>
                  <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                    <li>
                      Visit{' '}
                      <a
                        href="https://sam.gov/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        sam.gov
                      </a>{' '}
                      and sign in
                    </li>
                    <li>Navigate to Account Details page</li>
                    <li>Request an API Key (40 characters)</li>
                    <li>
                      Set the{' '}
                      <code className="bg-red-100 px-1 rounded">
                        GOV_API_KEY
                      </code>{' '}
                      environment variable
                    </li>
                    <li>Restart the development server</li>
                  </ol>
                  <p className="text-xs text-red-600 mt-3">
                    Note: According to{' '}
                    <a
                      href="https://api.sam.gov/docs/api-key/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      SAM.gov API documentation
                    </a>
                    , request limits apply based on your role.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {hasSearched && !loading && !error && (
        <div className="space-y-4">
          {/* Enhanced Results Header with Pagination Info */}
          <div className="flex justify-between items-center">
            <div className="text-slate-600">
              <p className="font-medium">
                Found {totalRecords.toLocaleString()} contracts
              </p>
              {contracts.length > 0 && (
                <p className="text-sm">
                  Page {currentPage} of {totalPages} • Showing{' '}
                  {contracts.length} results
                </p>
              )}
            </div>

            {/* Search Performance Indicator */}
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Live SAM.gov data</span>
            </div>
          </div>

          {/* Contracts Grid */}
          {contracts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {contracts.map((contract) => (
                  <ContractCard
                    key={contract.noticeId}
                    contract={contract}
                    onViewDocument={handleViewDocument}
                  />
                ))}
              </div>

              {/* Load More */}
              {contracts.length < totalRecords && (
                <div className="text-center pt-6">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Load More Contracts
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  No contracts found
                </h3>
                <p className="text-slate-500">
                  Try adjusting your search criteria or keywords
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Enhanced Initial State */}
      {!hasSearched && !loading && (
        <div className="space-y-6">
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                Search Government Contracts
              </h3>
              <p className="text-slate-500 mb-4">
                Enter search criteria above to find contract opportunities from
                SAM.gov
              </p>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                  <span>Auto-search as you type</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span>Response deadline filtering</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  <span>Enhanced set-aside codes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contract Document Viewer Modal */}
      <ContractDocumentViewer
        isOpen={showDocumentViewer}
        onClose={handleCloseDocumentViewer}
        contract={selectedContract}
      />
    </div>
  );
}

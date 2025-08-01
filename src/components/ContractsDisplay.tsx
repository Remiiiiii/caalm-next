'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useContractSearch } from '@/hooks/useContracts';
import {
  SAMContract,
  SAMContractSearchParams,
  NOTICE_TYPES,
  SET_ASIDE_TYPES,
  formatContractAmount,
  formatContractDate,
  getContractTypeDisplay,
  getSetAsideDisplay,
} from '@/lib/sam-config';

interface ContractCardProps {
  contract: SAMContract;
}

const ContractCard = ({ contract }: ContractCardProps) => {
  return (
    <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-slate-800 leading-tight mb-2">
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

      <CardContent className="space-y-4">
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
        <div className="flex gap-2 pt-2">
          {contract.uiLink && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(contract.uiLink, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on SAM.gov
            </Button>
          )}
          {contract.additionalInfoLink && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(contract.additionalInfoLink, '_blank')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function ContractsDisplay() {
  const { searchContracts, contracts, totalRecords, loading, error } =
    useContractSearch();

  const [searchParams, setSearchParams] = useState({
    keyword: '',
    noticeType: 'all',
    setAside: 'all',
    state: '',
    dept: '',
    limit: 25,
    offset: 0,
  });

  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    try {
      setHasSearched(true);
      const params = Object.fromEntries(
        Object.entries(searchParams).filter(
          ([key, value]) =>
            value !== '' &&
            value !== 'all' &&
            !(key === 'offset' && value === 0)
        )
      ) as Omit<SAMContractSearchParams, 'api_key'>;
      await searchContracts(params);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleReset = () => {
    setSearchParams({
      keyword: '',
      noticeType: 'all',
      setAside: 'all',
      state: '',
      dept: '',
      limit: 25,
      offset: 0,
    });
    setHasSearched(false);
  };

  const loadMore = async () => {
    const newParams = {
      ...searchParams,
      offset: searchParams.offset + searchParams.limit,
    };
    setSearchParams(newParams);

    // Filter params for API call
    const apiParams = Object.fromEntries(
      Object.entries(newParams).filter(
        ([key, value]) =>
          value !== '' && value !== 'all' && !(key === 'offset' && value === 0)
      )
    ) as Omit<SAMContractSearchParams, 'api_key'>;

    await searchContracts(apiParams);
  };

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
          <CardTitle className="flex items-center gap-2">
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
                placeholder="Enter search terms..."
                value={searchParams.keyword}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    keyword: e.target.value,
                  }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <Label htmlFor="noticeType">Notice Type</Label>
              <Select
                value={searchParams.noticeType}
                onValueChange={(value) =>
                  setSearchParams((prev) => ({ ...prev, noticeType: value }))
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
                value={searchParams.setAside}
                onValueChange={(value) =>
                  setSearchParams((prev) => ({ ...prev, setAside: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Set-Asides" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Set-Asides</SelectItem>
                  {Object.entries(SET_ASIDE_TYPES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="e.g., FL, CA, TX"
                value={searchParams.state}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    state: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="dept">Department</Label>
              <Input
                id="dept"
                placeholder="e.g., Defense, Agriculture"
                value={searchParams.dept}
                onChange={(e) =>
                  setSearchParams((prev) => ({ ...prev, dept: e.target.value }))
                }
              />
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

      {/* Results */}
      {error && (
        <div className="space-y-4">
          <Card className="bg-red-50 border border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error loading contracts</span>
              </div>
              <p className="text-red-700 mt-1">
                {typeof error === 'string'
                  ? error
                  : error?.message || 'An unknown error occurred'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {hasSearched && !loading && !error && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex justify-between items-center">
            <p className="text-slate-600">
              Found {totalRecords.toLocaleString()} contracts
              {contracts.length > 0 && (
                <span> (showing {contracts.length})</span>
              )}
            </p>
          </div>

          {/* Contracts Grid */}
          {contracts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {contracts.map((contract) => (
                  <ContractCard key={contract.noticeId} contract={contract} />
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

      {/* Initial State */}
      {!hasSearched && !loading && (
        <div className="space-y-6">
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                Search Government Contracts
              </h3>
              <p className="text-slate-500">
                Enter search criteria above to find contract opportunities from
                SAM.gov
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

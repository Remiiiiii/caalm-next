'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  Building2,
  Calendar,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useContracts } from '@/hooks/useContracts';
import {
  SAMContract,
  formatContractDate,
  getContractTypeDisplay,
} from '@/lib/sam-config';
import Link from 'next/link';

interface ContractOpportunitiesWidgetProps {
  maxItems?: number;
  autoRefresh?: boolean;
  searchKeywords?: string[];
}

export default function ContractOpportunitiesWidget({
  maxItems = 5,
  autoRefresh = true,
  searchKeywords = ['technology', 'software', 'consulting'],
}: ContractOpportunitiesWidgetProps) {
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const currentKeyword = searchKeywords[currentKeywordIndex];

  const { contracts, totalRecords, loading, error, mutate } = useContracts({
    keyword: currentKeyword,
    limit: maxItems,
    noticeType: 'o', // Solicitations only
  });

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      mutate();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, mutate]);

  // Cycle through keywords every 30 seconds when auto-refresh is enabled
  useEffect(() => {
    if (!autoRefresh || searchKeywords.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentKeywordIndex((prev) => (prev + 1) % searchKeywords.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, searchKeywords.length]);

  const handleRefresh = () => {
    mutate();
  };

  const getStatusColor = (contract: SAMContract) => {
    if (!contract.responseDeadLine) return 'bg-gray-100 text-gray-800';

    const deadline = new Date(contract.responseDeadLine);
    const now = new Date();
    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline < 0) return 'bg-red-100 text-red-800';
    if (daysUntilDeadline <= 7) return 'bg-orange-100 text-orange-800';
    if (daysUntilDeadline <= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg font-bold sidebar-gradient-text">
            <TrendingUp className="h-5 w-5" />
            Contract Opportunities
          </CardTitle>
          <div className="flex items-center gap-2">
            {searchKeywords.length > 1 && (
              <Badge variant="outline" className="text-xs">
                {currentKeyword}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="bg-white/30 backdrop-blur border border-white/40"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
        {totalRecords > 0 && (
          <p className="text-sm text-slate-600">
            {totalRecords.toLocaleString()} opportunities found
          </p>
        )}
      </CardHeader>

      <CardContent>
        {loading && contracts.length === 0 ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-600 text-sm mb-2">
              Failed to load opportunities
            </p>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.slice(0, maxItems).map((contract) => (
              <div
                key={contract.noticeId}
                className="border border-border rounded-lg p-3 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 text-sm line-clamp-2 mb-1">
                      {contract.title}
                    </h4>

                    {contract.department && (
                      <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{contract.department}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Posted: {formatContractDate(contract.postedDate)}
                      </span>
                    </div>

                    {contract.responseDeadLine && (
                      <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                        <span>
                          Due: {formatContractDate(contract.responseDeadLine)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStatusColor(contract)}`}
                    >
                      {getContractTypeDisplay(contract.type)}
                    </Badge>

                    {contract.uiLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(contract.uiLink, '_blank')}
                        className="bg-white/50 border-white/60 text-xs px-2 py-1 h-auto"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {totalRecords > maxItems && (
              <div className="text-center pt-3 border-t border-slate-200">
                <Link href="/contracts/advanced-resources">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/30 backdrop-blur border border-white/40"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    View All {totalRecords.toLocaleString()} Opportunities
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Search className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 mb-3">
              No opportunities found for &quot;{currentKeyword}&quot;
            </p>
            <Link href="/contracts/advanced-resources">
              <Button
                size="sm"
                variant="outline"
                className="bg-white/30 backdrop-blur border border-white/40"
              >
                <Search className="h-4 w-4 mr-2" />
                Search All Opportunities
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

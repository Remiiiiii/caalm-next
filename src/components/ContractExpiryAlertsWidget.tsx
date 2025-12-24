'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';
import { useManagerContracts } from '@/hooks/useManagerContracts';
import useSWR from 'swr';
import { swrConfig, swrKeys } from '@/lib/swr-config';

interface Contract {
  $id: string;
  contractName: string;
  name?: string;
  contractExpiryDate?: string;
  status?: string;
  amount?: number;
  daysUntilExpiry?: number;
  compliance?: string;
  assignedManagers?: string[];
  fileId?: string;
  fileRef?: unknown;
}

interface ContractExpiryAlertsWidgetProps {
  className?: string;
  maxVisible?: number;
  showSettings?: boolean;
  compact?: boolean; // For carousel mode
  contracts?: Contract[]; // Optional: pass contracts directly (from ContractsMetricsBar or page data)
}

const ContractExpiryAlertsWidget = ({
  className = '',
  maxVisible = 3,
  showSettings = true,
  compact = false,
  contracts: propsContracts,
}: ContractExpiryAlertsWidgetProps) => {
  // Use contracts from props if provided, otherwise fetch all contracts from database
  const {
    data: allContractsData,
    error: allContractsError,
    isLoading: allContractsLoading,
  } = useSWR(
    propsContracts ? null : swrKeys.allContracts(),
    swrConfig.fetcher || null,
    {
      ...swrConfig,
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false,
    }
  );

  // Fallback to manager contracts hook if all contracts endpoint fails
  const {
    contracts: hookContracts,
    isLoading: hookLoading,
    error: hookError,
  } = useManagerContracts();

  // Extract contracts from API response (wrapped in { success: true, data: [...] })
  const allContracts = Array.isArray(allContractsData)
    ? allContractsData
    : allContractsData?.data || [];

  // Use props first, then all contracts, then manager contracts
  const contracts = propsContracts || allContracts || hookContracts;
  const isLoading = propsContracts ? false : allContractsLoading || hookLoading;
  const error = propsContracts ? null : allContractsError || hookError;

  // Debug logging (remove in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ContractExpiryAlertsWidget - Contracts:', {
        propsContracts: propsContracts?.length || 0,
        allContracts: allContracts?.length || 0,
        hookContracts: hookContracts?.length || 0,
        totalContracts: contracts?.length || 0,
        isLoading,
        error: error?.message || null,
      });
    }
  }, [
    propsContracts,
    allContracts,
    hookContracts,
    contracts,
    isLoading,
    error,
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExpired, setShowExpired] = useState(true);
  const [filterDays, setFilterDays] = useState(30); // Default: Show contracts expiring within 30 days
  const [isMinimized, setIsMinimized] = useState(false);

  // Calculate days until expiry - always calculate from contractExpiryDate for accuracy
  // The database daysUntilExpiry may be stale, so we recalculate to ensure current values
  const getDaysUntilExpiry = (contract: Contract): number => {
    // Always calculate from contractExpiryDate for real-time accuracy
    if (!contract.contractExpiryDate) {
      // If no expiry date, check if database has daysUntilExpiry as fallback
      if (
        contract.daysUntilExpiry !== undefined &&
        contract.daysUntilExpiry !== null
      ) {
        return contract.daysUntilExpiry;
      }
      return Infinity;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Parse date-only strings (YYYY-MM-DD) using local timezone to avoid timezone issues
      const expiryStr = contract.contractExpiryDate.split('T')[0];
      const [year, month, day] = expiryStr.split('-').map(Number);
      const expiry = new Date(year, month - 1, day);
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return days;
    } catch (error) {
      console.error('Error calculating days until expiry:', error);
      // Fallback to database value if calculation fails
      if (
        contract.daysUntilExpiry !== undefined &&
        contract.daysUntilExpiry !== null
      ) {
        return contract.daysUntilExpiry;
      }
      return Infinity;
    }
  };

  // Filter and sort contracts by expiry urgency
  const filteredContracts = useMemo(() => {
    if (!contracts || contracts.length === 0) return [];

    return contracts
      .filter((contract: Contract) => {
        // Must have either contractExpiryDate or daysUntilExpiry
        if (
          !contract.contractExpiryDate &&
          contract.daysUntilExpiry === undefined
        ) {
          return false;
        }

        const daysUntilExpiry = getDaysUntilExpiry(contract);

        // Include expired contracts if showExpired is true
        if (daysUntilExpiry < 0 && !showExpired) return false;

        // Filter by days threshold (but always include expired if showExpired is true)
        // Show contracts expiring within the selected number of days
        if (daysUntilExpiry >= 0 && daysUntilExpiry > filterDays) return false;

        return true;
      })
      .sort((a: Contract, b: Contract) => {
        const daysA = getDaysUntilExpiry(a);
        const daysB = getDaysUntilExpiry(b);
        return daysA - daysB; // Sort by urgency (least days first)
      });
  }, [contracts, showExpired, filterDays]);

  // Get contracts to display based on pagination
  const visibleContracts = useMemo(() => {
    const start = currentIndex;
    const end = start + maxVisible;
    return filteredContracts.slice(start, end);
  }, [filteredContracts, currentIndex, maxVisible]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentIndex(0);
  }, [showExpired, filterDays]);

  const canGoNext = currentIndex + maxVisible < filteredContracts.length;
  const canGoPrev = currentIndex > 0;

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + maxVisible);
    }
  };

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentIndex(Math.max(0, currentIndex - maxVisible));
    }
  };

  const getUrgencyStats = () => {
    const stats = {
      expired: 0,
      critical: 0, // 1-7 days
      warning: 0, // 8-30 days
      attention: 0, // 31-90 days
    };

    filteredContracts.forEach((contract: Contract) => {
      const days = getDaysUntilExpiry(contract);
      if (days < 0) stats.expired++;
      else if (days <= 7) stats.critical++;
      else if (days <= 30) stats.warning++;
      else stats.attention++;
    });

    return stats;
  };

  const urgencyStats = getUrgencyStats();

  // Compact carousel version
  if (compact) {
    if (isLoading) {
      return (
        <Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
          <div className="glass-card-cap" />
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <CardTitle className="text-sm font-semibold sidebar-gradient-text">
                Contract Expiry Alerts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-2 flex items-center justify-center h-full">
            <div className="text-sm text-slate-500">Loading contracts...</div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
          <div className="glass-card-cap" />
          <CardHeader className="pb-3 pt-6 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-semibold sidebar-gradient-text">
                Contract Expiry Alerts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-2 flex items-center justify-center h-full">
            <div className="text-sm text-red-500 text-center">
              Failed to load contract data
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="glass-card w-full h-auto min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
        <div className="glass-card-cap" />
        <CardHeader className="pb-2 pt-6 px-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-slate-600" />
            <CardTitle className="text-sm font-semibold sidebar-gradient-text">
              Contract Expiry Alerts
            </CardTitle>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-slate-600" />
              <select
                value={filterDays}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilterDays(Number(e.target.value))
                }
                className="text-xs border border-white/40 rounded px-2 py-1 bg-white/50 text-slate-600"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
            </div>

            <button
              onClick={() => setShowExpired(!showExpired)}
              className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20 min-w-[140px] cursor-pointer hover:bg-white/30 transition-colors"
            >
              {showExpired ? (
                <EyeOff className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
              )}
              <span className="text-xs text-slate-600 font-medium">
                {showExpired ? 'Hide' : 'Show'} Expired
              </span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-2">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-1">
                No contracts expiring soon
              </p>
              <p className="text-xs text-slate-400">
                All contracts are within safe periods
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[190px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {visibleContracts.map((contract: Contract) => (
                <div
                  key={contract.$id}
                  className="bg-white/20 rounded-lg p-2 backdrop-blur-sm border border-white/20 hover:bg-white/30 transition-colors duration-200"
                >
                  <CountdownTimer
                    targetDate={contract.contractExpiryDate || ''}
                    contractName={contract.contractName}
                    size="sm"
                    className="transition-all duration-200"
                  />
                </div>
              ))}

              {/* Pagination indicator */}
              {filteredContracts.length > maxVisible && (
                <div className="text-center pt-1">
                  <span className="text-xs text-slate-500">
                    {Math.min(
                      currentIndex + maxVisible,
                      filteredContracts.length
                    )}{' '}
                    of {filteredContracts.length}
                  </span>
                  <div className="flex justify-center space-x-1 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentIndex(Math.max(0, currentIndex - maxVisible))
                      }
                      disabled={currentIndex === 0}
                      className="h-5 w-5 p-0"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentIndex(
                          Math.min(
                            filteredContracts.length - maxVisible,
                            currentIndex + maxVisible
                          )
                        )
                      }
                      disabled={
                        currentIndex + maxVisible >= filteredContracts.length
                      }
                      className="h-5 w-5 p-0"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card
        className={`bg-white/30 backdrop-blur border border-white/40 shadow-lg ${className}`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-bold sidebar-gradient-text">
            <Clock className="h-5 w-5" />
            Contract Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-24 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={`bg-white/30 backdrop-blur border border-white/40 shadow-lg ${className}`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg font-bold sidebar-gradient-text">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Contract Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-4">
            <p>Failed to load contract data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-white/30 backdrop-blur border border-white/40 shadow-lg ${className}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-bold sidebar-gradient-text">
            <Clock className="h-5 w-5" />
            Contract Expiry Alerts
            {filteredContracts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredContracts.length}
              </Badge>
            )}
          </CardTitle>

          {showSettings && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Urgency Stats */}
        <div className="flex items-center space-x-4 mt-3">
          {urgencyStats.expired > 0 && (
            <Badge className="text-xs bg-red-600 text-white">
              {urgencyStats.expired} Expired
            </Badge>
          )}
          {urgencyStats.critical > 0 && (
            <Badge className="text-xs bg-red-100 text-red-800">
              {urgencyStats.critical} Critical
            </Badge>
          )}
          {urgencyStats.warning > 0 && (
            <Badge className="text-xs bg-orange-100 text-orange-800">
              {urgencyStats.warning} Warning
            </Badge>
          )}
          {urgencyStats.attention > 0 && (
            <Badge className="text-xs bg-gray-100 text-gray-800">
              {urgencyStats.attention} Attention
            </Badge>
          )}
        </div>

        {/* Filter Controls */}
        {showSettings && !isMinimized && (
          <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <select
                value={filterDays}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilterDays(Number(e.target.value))
                }
                className="text-xs border border-white/40 rounded px-2 py-1 bg-white/50"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
            </div>

            <button
              onClick={() => setShowExpired(!showExpired)}
              className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20 min-w-[140px] cursor-pointer hover:bg-white/30 transition-colors"
            >
              {showExpired ? (
                <EyeOff className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
              )}
              <span className="text-xs text-slate-600 font-medium">
                {showExpired ? 'Hide' : 'Show'} Expired
              </span>
            </button>
          </div>
        )}
      </CardHeader>

      {!isMinimized && (
        <CardContent className="pt-0">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                No contracts expiring soon
              </p>
              <p className="text-gray-400 text-xs mt-1">
                All contracts are within safe expiry periods
              </p>
            </div>
          ) : (
            <>
              {/* Countdown Timers */}
              <div className="space-y-4">
                {visibleContracts.map((contract: Contract) => (
                  <CountdownTimer
                    key={contract.$id}
                    targetDate={contract.contractExpiryDate || ''}
                    contractName={contract.contractName}
                    size="sm"
                    className="transition-all duration-200 hover:shadow-md"
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {filteredContracts.length > maxVisible && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrev}
                    disabled={!canGoPrev}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <span className="text-xs text-slate-600">
                    {currentIndex + 1}-
                    {Math.min(
                      currentIndex + maxVisible,
                      filteredContracts.length
                    )}{' '}
                    of {filteredContracts.length}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className="h-8 px-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ContractExpiryAlertsWidget;

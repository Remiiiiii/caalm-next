'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Clock,
  Calendar,
  Settings,
  Eye,
  EyeOff,
  Filter,
  Bell,
  BellOff,
  X,
  Minimize2,
  VolumeOff,
} from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';
import { useManagerContracts } from '@/hooks/useManagerContracts';
import useSWR from 'swr';
import { swrConfig, swrKeys } from '@/lib/swr-config';
import { useContractAlarm } from '@/hooks/useContractAlarm';

interface Contract {
  $id: string;
  contractName: string;
  name?: string;
  contractExpiryDate?: string;
  isExpired?: boolean; // From database
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
  maxVisible = 2,
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

  // Trigger update of expired contracts when component mounts
  useEffect(() => {
    // Call the update-expired endpoint to ensure isExpired is up-to-date
    const updateExpiredContracts = async () => {
      try {
        const response = await fetch('/api/contracts/update-expired', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (process.env.NODE_ENV === 'development') {
            console.log(
              '[ContractExpiryAlertsWidget] Updated expired contracts:',
              result
            );
          }
        }
      } catch (error) {
        // Silently fail - this is a background update
        console.warn('Failed to update expired contracts:', error);
      }
    };

    // Only call once when component mounts, not on every render
    updateExpiredContracts();
  }, []); // Empty dependency array - only run once on mount

  const [filterDays, setFilterDays] = useState(30); // Default: Show contracts expiring within 30 days
  const [isMinimized, setIsMinimized] = useState(false);

  // Ensure contracts is always an array for stable hook dependencies
  const contractsArray = useMemo(() => {
    return Array.isArray(contracts) ? contracts : [];
  }, [contracts]);

  // Contract alarm hook
  const {
    isPlaying,
    isSilenced,
    silenceAlarm,
    dismissAlarm,
    expiringContractsCount,
    expiredContractsCount,
  } = useContractAlarm({
    contracts: contractsArray,
    enabled: true,
  });

  // Calculate days until expiry - always calculate from contractExpiryDate for accuracy
  // The database daysUntilExpiry may be stale, so we recalculate to ensure current values
  const getDaysUntilExpiry = useCallback((contract: Contract): number => {
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
  }, []);

  // Filter contracts to show those expiring within the selected filter period
  // Implement infinite scroll - show all filtered contracts
  const filteredContracts = useMemo(() => {
    if (!contracts || contracts.length === 0) return [];

    const filtered = contracts
      .filter((contract: Contract) => {
        // Must have either contractExpiryDate or daysUntilExpiry
        if (
          !contract.contractExpiryDate &&
          contract.daysUntilExpiry === undefined
        ) {
          return false;
        }

        // Calculate days until expiry once
        const daysUntilExpiry = getDaysUntilExpiry(contract);

        // Check if contract is expired - ONLY use database flag
        // Ignore date calculation to avoid inconsistencies with database state
        const isExpired = contract.isExpired === true;

        // Special filter value -1 means "Expired" filter is selected
        if (filterDays === -1) {
          // Only show expired contracts
          return isExpired;
        }

        // For all other filter values, exclude expired contracts
        if (isExpired) {
          return false;
        }

        // Tiered filter ranges:
        // 30 days: 0-30 days
        // 60 days: 31-60 days
        // 90 days: 61-90 days
        // 180 days (6 months): 91-180 days
        // 365 days (1 year): 181-365 days
        let minDays = 0;
        let maxDays = filterDays;

        if (filterDays === 30) {
          minDays = 0;
          maxDays = 30;
        } else if (filterDays === 60) {
          minDays = 31;
          maxDays = 60;
        } else if (filterDays === 90) {
          minDays = 61;
          maxDays = 90;
        } else if (filterDays === 180) {
          minDays = 91;
          maxDays = 180;
        } else if (filterDays === 365) {
          minDays = 181;
          maxDays = 365;
        }

        return daysUntilExpiry >= minDays && daysUntilExpiry <= maxDays;
      })
      .sort((a: Contract, b: Contract) => {
        const daysA = getDaysUntilExpiry(a);
        const daysB = getDaysUntilExpiry(b);
        return daysA - daysB; // Sort by urgency (least days first)
      });

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      const expiredInList = filtered.filter((c: Contract) => {
        const days = getDaysUntilExpiry(c);
        const isExpiredByDate = days < 0;
        const isExplicitlyExpired = c.isExpired === true;
        return isExpiredByDate || isExplicitlyExpired;
      });
      const expiringInList = filtered.filter((c: Contract) => {
        const days = getDaysUntilExpiry(c);
        const isExpiredByDate = days < 0;
        const isExplicitlyExpired = c.isExpired === true;
        const isExpired = isExpiredByDate || isExplicitlyExpired;
        return !isExpired && days >= 0 && days <= filterDays;
      });
      console.log('[ContractExpiryAlertsWidget] Filtered contracts:', {
        total: contracts.length,
        filtered: filtered.length,
        expiredInFiltered: expiredInList.length,
        expiringInFiltered: expiringInList.length,
        filterDays,
        allContracts: contracts.map((c: Contract) => ({
          id: c.$id,
          name: c.contractName,
          days: getDaysUntilExpiry(c),
          isExpired: c.isExpired,
          isExpiredByDate: getDaysUntilExpiry(c) < 0,
          isInFilterRange:
            getDaysUntilExpiry(c) >= 0 && getDaysUntilExpiry(c) <= filterDays,
        })),
        filteredContracts: filtered.map((c: Contract) => ({
          id: c.$id,
          name: c.contractName,
          days: getDaysUntilExpiry(c),
          isExpired: c.isExpired,
        })),
      });
    }

    return filtered;
  }, [contracts, filterDays, getDaysUntilExpiry]);

  // Calculate expired count from ALL contracts
  // ONLY use database isExpired flag as the source of truth
  const expiredCountFromAll = useMemo(() => {
    if (!contracts || contracts.length === 0) return 0;
    return contracts.filter((contract: Contract) => {
      // Only count contracts explicitly marked as expired in the database
      return contract.isExpired === true;
    }).length;
  }, [contracts]);

  // Calculate expiring count from ALL contracts
  // This shows contracts expiring within the selected filter period
  // Excludes contracts that have already expired
  const expiringCountFromFiltered = useMemo(() => {
    if (!contracts || contracts.length === 0) return 0;

    const expiringContracts = contracts.filter((contract: Contract) => {
      // Must have expiry date or daysUntilExpiry
      if (
        !contract.contractExpiryDate &&
        contract.daysUntilExpiry === undefined
      ) {
        return false;
      }

      // Calculate days until expiry
      const daysUntilExpiry = getDaysUntilExpiry(contract);

      // Skip contracts with invalid expiry dates (Infinity means no valid date)
      if (daysUntilExpiry === Infinity || daysUntilExpiry === -Infinity) {
        return false;
      }

      // Check if contract is expired - ONLY use database flag
      // Ignore date calculation to avoid inconsistencies with database state
      const isExpired = contract.isExpired === true;

      // Skip expired contracts
      if (isExpired) {
        return false;
      }

      // Tiered filter ranges:
      // 30 days: 0-30 days
      // 60 days: 31-60 days
      // 90 days: 61-90 days
      // 180 days (6 months): 91-180 days
      // 365 days (1 year): 181-365 days
      let minDays = 0;
      let maxDays = filterDays;

      if (filterDays === 30) {
        minDays = 0;
        maxDays = 30;
      } else if (filterDays === 60) {
        minDays = 31;
        maxDays = 60;
      } else if (filterDays === 90) {
        minDays = 61;
        maxDays = 90;
      } else if (filterDays === 180) {
        minDays = 91;
        maxDays = 180;
      } else if (filterDays === 365) {
        minDays = 181;
        maxDays = 365;
      }

      return daysUntilExpiry >= minDays && daysUntilExpiry <= maxDays;
    });

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[ContractExpiryAlertsWidget] Expiring count calculation:', {
        totalContracts: contracts.length,
        filterDays,
        expiringCount: expiringContracts.length,
        contracts: contracts.map((c: Contract) => {
          const days = getDaysUntilExpiry(c);
          const isExpiredByDate = days < 0;
          const isExpired = c.isExpired === true;
          const hasValidDate = days !== Infinity && days !== -Infinity;
          const isInRange = hasValidDate && days >= 0 && days <= filterDays;
          const willBeIncluded = hasValidDate && !isExpired && isInRange;

          return {
            id: c.$id,
            name: c.contractName,
            contractExpiryDate: c.contractExpiryDate,
            daysUntilExpiry: days,
            isExpiredDB: c.isExpired,
            isExpiredByDate,
            isExpired,
            hasValidDate,
            isInRange,
            willBeIncluded,
          };
        }),
      });
    }

    return expiringContracts.length;
  }, [contracts, filterDays, getDaysUntilExpiry]);

  // No pagination - show all filtered contracts in infinite scroll

  const getUrgencyStats = () => {
    const stats = {
      expired: 0,
      critical: 0, // 1-7 days
      warning: 0, // 8-30 days
      attention: 0, // 31-90 days
    };

    filteredContracts.forEach((contract: Contract) => {
      // Check if contract is expired - prioritize date calculation
      // Contracts expiring today (days = 0) should be counted as expiring, not expired
      const days = getDaysUntilExpiry(contract);
      const isContractExpired = days < 0; // Only truly expired if days < 0
      const isExplicitlyExpired = contract.isExpired === true;
      const isExpired = isContractExpired || isExplicitlyExpired;

      if (isExpired) {
        stats.expired++;
      } else {
        // Include contracts expiring today (days = 0) in the urgency stats
        if (days <= 7) stats.critical++;
        else if (days <= 30) stats.warning++;
        else stats.attention++;
      }
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
      <Card className="glass-card w-full h-[200px] sm:h-[250px] lg:h-[300px] flex flex-col overflow-hidden">
        <div className="glass-card-cap" />
        <CardHeader className="pb-2 pt-6 px-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <CardTitle className="text-sm font-semibold sidebar-gradient-text">
                Contract Expiry Alerts
              </CardTitle>
            </div>
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
                <option value={-1}>Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Contract Status Display */}
              <div className="flex items-center gap-2">
                {expiringCountFromFiltered > 0 && filterDays !== -1 && (
                  <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-2 py-1 backdrop-blur-sm border border-white/20  hover:bg-white/30 transition-colors">
                    <Bell
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isPlaying ? 'text-orange animate-pulse' : 'text-orange'
                      }`}
                    />
                    <span className="text-xs text-orange font-medium">
                      {expiringCountFromFiltered} expiring
                    </span>
                  </div>
                )}
                {expiredCountFromAll > 0 && (
                  <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                    <span className="text-xs text-red-600 font-medium">
                      {expiredCountFromAll} expired
                    </span>
                  </div>
                )}
              </div>

              {/* Alarm Controls - positioned to the right of expired count */}
              {isPlaying && (
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1 backdrop-blur-sm border border-white/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => silenceAlarm()}
                    className="h-7 bg-white/90 hover:bg-white/100 rounded-full px-2 py-1 backdrop-blur-md border border-white/20"
                    title="Silence alarm for 1 hour"
                  >
                    <VolumeOff className="h-3 w-3 text-red" />
                    <span className="text-xs text-slate-600">Silence</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissAlarm}
                    className="h-7 w-7 p-0 bg-white/90 hover:bg-white/100 rounded-full px-2 py-1 backdrop-blur-md border border-white/20"
                    title="Dismiss alarm for 24 hours"
                  >
                    <Minimize2 className="h-3 w-3 text-slate-600" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-6 flex-1 flex flex-col items-center justify-center">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-1">
                {filterDays === -1
                  ? 'No expired contracts'
                  : `No contracts expiring ${
                      filterDays === 30
                        ? 'within 30 days'
                        : filterDays === 60
                        ? 'in 31-60 days'
                        : filterDays === 90
                        ? 'in 61-90 days'
                        : filterDays === 180
                        ? 'in 91-180 days (6 months)'
                        : filterDays === 365
                        ? 'in 181-365 days (1 year)'
                        : `within ${filterDays} days`
                    }`}
              </p>
              <p className="text-xs text-slate-400">
                {filterDays === -1
                  ? 'All contracts are active'
                  : 'All contracts are within safe periods'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent min-h-0">
              {filteredContracts.map((contract: Contract) => (
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
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center text-lg font-bold sidebar-gradient-text">
              <Clock className="h-5 w-5" />
              Contract Expiry Alerts
              {filteredContracts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredContracts.length}
                </Badge>
              )}
            </CardTitle>

            {/* Expired Contracts Count in Header */}
            {expiredContractsCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">
                  {expiredContractsCount} expired
                </span>
              </div>
            )}
          </div>

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
                <option value={-1}>Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Alarm Controls */}
              {isPlaying && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => silenceAlarm()}
                    className="h-7 px-2 bg-orange/50 hover:bg-orange/70 border border-orange/50 text-orange"
                    title="Silence alarm for 1 hour"
                  >
                    <BellOff className="h-3 w-3 mr-1" />
                    <span className="text-xs">Silence</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissAlarm}
                    className="h-7 w-7 p-0 bg-orange-100/50 hover:bg-orange-100/70 border border-orange-300/50 text-orange-700"
                    title="Dismiss alarm for 24 hours"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {/* Contract Status Display */}
              <div className="flex items-center gap-2">
                {expiringCountFromFiltered > 0 && filterDays !== -1 && (
                  <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
                    <Bell
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isPlaying ? 'text-orange animate-pulse' : 'text-orange'
                      }`}
                    />
                    <span className="text-xs text-orange font-medium">
                      {expiringCountFromFiltered} expiring
                    </span>
                  </div>
                )}
                {expiredCountFromAll > 0 && (
                  <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-red flex-shrink-0" />
                    <span className="text-xs text-red font-medium">
                      {expiredCountFromAll} expired
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      {!isMinimized && (
        <CardContent className="pt-0">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                {filterDays === -1
                  ? 'No expired contracts'
                  : 'No contracts expiring soon'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {filterDays === -1
                  ? 'All contracts are active'
                  : 'All contracts are within safe expiry periods'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {filteredContracts.map((contract: Contract) => (
                <CountdownTimer
                  key={contract.$id}
                  targetDate={contract.contractExpiryDate || ''}
                  contractName={contract.contractName}
                  size="sm"
                  className="transition-all duration-200 hover:shadow-md"
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ContractExpiryAlertsWidget;

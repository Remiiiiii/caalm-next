'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertTriangle } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';
import { Contract, getEmptyStateMessage } from './types';
import { ContractFilterControls } from './ContractFilterControls';
import { ContractStatusBadges } from './ContractStatusBadges';
import { AlarmControls } from './AlarmControls';
import { ContractEmptyState } from './ContractEmptyState';

interface CompactContractExpiryWidgetProps {
  isLoading: boolean;
  error: Error | null;
  filteredContracts: Contract[];
  filterDays: number;
  onFilterChange: (value: number) => void;
  expiringCount: number;
  expiredCount: number;
  isPlaying: boolean;
  onSilence: () => void;
  onDismiss: () => void;
}

export const CompactContractExpiryWidget: React.FC<
  CompactContractExpiryWidgetProps
> = ({
  isLoading,
  error,
  filteredContracts,
  filterDays,
  onFilterChange,
  expiringCount,
  expiredCount,
  isPlaying,
  onSilence,
  onDismiss,
}) => {
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
            <AlertTriangle className="h-4 w-4 text-red" />
            <CardTitle className="text-sm font-semibold sidebar-gradient-text">
              Contract Expiry Alerts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-2 flex items-center justify-center h-full">
          <div className="text-sm text-red text-center">
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
          <ContractFilterControls
            filterDays={filterDays}
            onFilterChange={onFilterChange}
            id="contract-filter-compact"
            size="sm"
          />

          <div className="flex items-center gap-2">
            <ContractStatusBadges
              expiringCount={expiringCount}
              expiredCount={expiredCount}
              filterDays={filterDays}
              isPlaying={isPlaying}
              size="sm"
            />

            <AlarmControls
              isPlaying={isPlaying}
              onSilence={onSilence}
              onDismiss={onDismiss}
              variant="compact"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        {filteredContracts.length === 0 ? (
          <ContractEmptyState filterDays={filterDays} variant="compact" />
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
};

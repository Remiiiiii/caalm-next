'use client';

import React from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { FILTER_VALUES } from './types';

interface ContractStatusBadgesProps {
  expiringCount: number;
  expiredCount: number;
  filterDays: number;
  isPlaying?: boolean;
  size?: 'sm' | 'md';
}

export const ContractStatusBadges: React.FC<ContractStatusBadgesProps> = ({
  expiringCount,
  expiredCount,
  filterDays,
  isPlaying = false,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-4 py-1';

  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      {expiringCount > 0 && filterDays !== FILTER_VALUES.EXPIRED && (
        <div
          className={`flex items-center justify-center gap-2 bg-white/50 rounded-full ${padding} backdrop-blur-sm border border-white/100 animate-pulse ${
            size === 'sm' ? 'hover:bg-white/30 transition-colors' : ''
          }`}
        >
          <Bell className={`${iconSize} flex-shrink-0 text-orange`} />
          <span className={`${textSize} text-orange font-medium`}>
            {expiringCount} expiring
          </span>
        </div>
      )}
      {expiredCount > 0 && (
        <div
          className={`flex items-center justify-center gap-2 bg-white/50 rounded-full ${padding} backdrop-blur-sm border border-white/100`}
        >
          <AlertTriangle className={`${iconSize} text-red flex-shrink-0`} />
          <span className={`${textSize} text-red font-medium`}>
            {expiredCount} expired
          </span>
        </div>
      )}
    </div>
  );
};

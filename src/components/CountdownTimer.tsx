'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Calendar } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string; // ISO date string
  contractName: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const CountdownTimer = ({
  targetDate,
  contractName,
  size = 'md',
  showIcon = true,
  className = '',
}: CountdownTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const calculateTimeRemaining = (target: string): TimeRemaining => {
    const now = new Date().getTime();
    const targetTime = new Date(target).getTime();
    const difference = targetTime - now;

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
      };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
    };
  };

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const getUrgencyLevel = () => {
    if (timeRemaining.isExpired) return 'expired';
    if (timeRemaining.days <= 1) return 'critical';
    if (timeRemaining.days <= 7) return 'warning';
    if (timeRemaining.days <= 30) return 'attention';
    return 'normal';
  };

  const getUrgencyColors = () => {
    const urgency = getUrgencyLevel();
    switch (urgency) {
      case 'expired':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          accent: 'text-red-600',
          icon: 'text-red-500',
        };
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          accent: 'text-red-600',
          icon: 'text-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-800',
          accent: 'text-orange-600',
          icon: 'text-orange-500',
        };
      case 'attention':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          accent: 'text-yellow-600',
          icon: 'text-yellow-500',
        };
      default:
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          accent: 'text-green-600',
          icon: 'text-green-500',
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-3',
          title: 'text-sm font-medium',
          time: 'text-lg font-bold',
          label: 'text-xs',
          icon: 'h-4 w-4',
        };
      case 'lg':
        return {
          container: 'p-6',
          title: 'text-lg font-semibold',
          time: 'text-3xl font-bold',
          label: 'text-sm',
          icon: 'h-6 w-6',
        };
      default:
        return {
          container: 'p-4',
          title: 'text-base font-medium',
          time: 'text-2xl font-bold',
          label: 'text-sm',
          icon: 'h-5 w-5',
        };
    }
  };

  const colors = getUrgencyColors();
  const sizeClasses = getSizeClasses();
  const urgency = getUrgencyLevel();

  const formatTimeUnit = (value: number, unit: string) => {
    return (
      <div className="text-center">
        <div className={`${sizeClasses.time} ${colors.accent}`}>
          {value.toString().padStart(2, '0')}
        </div>
        <div className={`${sizeClasses.label} ${colors.text} uppercase tracking-wide`}>
          {unit}
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-lg border ${colors.bg} ${sizeClasses.container} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {showIcon && (
            <>
              {timeRemaining.isExpired ? (
                <AlertTriangle className={`${sizeClasses.icon} ${colors.icon}`} />
              ) : (
                <Clock className={`${sizeClasses.icon} ${colors.icon}`} />
              )}
            </>
          )}
          <h3 className={`${sizeClasses.title} ${colors.text} truncate`}>
            {contractName}
          </h3>
        </div>
        <Calendar className={`${sizeClasses.icon} ${colors.icon} opacity-60`} />
      </div>

      {timeRemaining.isExpired ? (
        <div className="text-center">
          <div className={`${sizeClasses.time} ${colors.accent} mb-2`}>
            EXPIRED
          </div>
          <div className={`${sizeClasses.label} ${colors.text}`}>
            Contract has expired
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {formatTimeUnit(timeRemaining.days, 'Days')}
            {formatTimeUnit(timeRemaining.hours, 'Hours')}
            {formatTimeUnit(timeRemaining.minutes, 'Min')}
            {formatTimeUnit(timeRemaining.seconds, 'Sec')}
          </div>

          <div className="text-center">
            <div className={`${sizeClasses.label} ${colors.text}`}>
              {urgency === 'critical' && 'Expires very soon!'}
              {urgency === 'warning' && 'Expires this week'}
              {urgency === 'attention' && 'Expires this month'}
              {urgency === 'normal' && 'Time remaining until expiry'}
            </div>
          </div>
        </>
      )}

      {/* Progress bar for visual representation */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              urgency === 'expired' || urgency === 'critical'
                ? 'bg-red-500'
                : urgency === 'warning'
                ? 'bg-orange-500'
                : urgency === 'attention'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{
              width: timeRemaining.isExpired
                ? '100%'
                : `${Math.max(
                    10,
                    Math.min(
                      100,
                      100 - (timeRemaining.days / 365) * 100
                    )
                  )}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
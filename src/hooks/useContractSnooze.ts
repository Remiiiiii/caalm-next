'use client';

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SnoozeContractParams {
  contractId: string;
  days: number;
  expiryDate: string;
}

export function useContractSnooze() {
  const { toast } = useToast();

  const snoozeContract = useCallback(
    async ({ contractId, days, expiryDate }: SnoozeContractParams) => {
      try {
        // Prevent snoozing test contracts - they don't exist in the database
        if (contractId.startsWith('test-')) {
          throw new Error('Cannot snooze test contracts. Please use a real contract from the database.');
        }

        // Calculate snoozedUntil date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const snoozedUntil = new Date(today);
        snoozedUntil.setDate(today.getDate() + days);

        // Ensure we don't snooze past 1 day before expiry (24-hour mark)
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const maxSnoozeDate = new Date(expiry);
        maxSnoozeDate.setDate(expiry.getDate() - 1);

        const finalSnoozeDate =
          snoozedUntil > maxSnoozeDate ? maxSnoozeDate : snoozedUntil;

        const response = await fetch('/api/contracts/snooze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractId,
            snoozedUntil: finalSnoozeDate.toISOString().split('T')[0],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || 'Failed to snooze contract';
          throw new Error(errorMessage);
        }

        const formattedDate = format(finalSnoozeDate, 'MMMM d, yyyy');
        
        // Determine toast message based on days
        let description = `Contract expiry notification snoozed until ${formattedDate}`;
        if (days === 30) {
          // For 30-day mark, show that it's snoozed until 10 days before expiry
          const expiry = new Date(expiryDate);
          expiry.setHours(0, 0, 0, 0);
          const tenDaysBefore = new Date(expiry);
          tenDaysBefore.setDate(expiry.getDate() - 10);
          const tenDaysFormatted = format(tenDaysBefore, 'MMMM d, yyyy');
          description = `Contract expiry notification snoozed until ${tenDaysFormatted} (10 days before expiry)`;
        }

        toast({
          title: 'Contract snoozed',
          description,
        });

        return true;
      } catch (error) {
        console.error('Failed to snooze contract:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to snooze contract. Please try again.';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast]
  );

  return { snoozeContract };
}

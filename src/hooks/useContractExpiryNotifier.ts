import { useEffect } from 'react';

export interface ContractLike {
  id: string;
  name: string;
  expiryDate: string; // ISO
}

const TRIGGER_DAYS = new Set([30, 15, 10, 5, 1]);

export function useContractExpiryNotifier(
  contracts: ContractLike[],
  onTrigger: (c: ContractLike, daysToExpiry: number) => void
) {
  useEffect(() => {
    const check = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const c of contracts) {
        const expiry = new Date(c.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const diff = expiry.getTime() - today.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (TRIGGER_DAYS.has(days)) onTrigger(c, days);
      }
    };

    // initial check and then daily
    check();
    const interval = setInterval(check, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [contracts, onTrigger]);
}


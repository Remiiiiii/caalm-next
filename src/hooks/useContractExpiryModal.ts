'use client';

import { useMemo, useEffect, useState } from 'react';
import type { UIFileDoc } from '@/types/files';

/**
 * Calculate days until expiry for a contract
 * Uses the same logic as ContractsMetricsBar.tsx
 */
function calculateDaysUntilExpiry(
  expiryDate: string | undefined
): number | null {
  if (!expiryDate) return null;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse date-only strings (YYYY-MM-DD) using local timezone to avoid timezone issues
    const expiryStr = expiryDate.split('T')[0];
    const [year, month, day] = expiryStr.split('-').map(Number);
    const expiry = new Date(year, month - 1, day);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return days;
  } catch (error) {
    console.error('Error calculating days until expiry:', error);
    return null;
  }
}

/**
 * Hook to detect contracts expiring in exactly 30 days
 * Tracks shown contracts in sessionStorage to prevent re-triggering
 */
export function useContractExpiryModal(files: UIFileDoc[]) {
  const [shownContractIds, setShownContractIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testContracts, setTestContracts] = useState<UIFileDoc[]>([]);

  // Load shown contract IDs from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = sessionStorage.getItem('expiryModalShown');
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setShownContractIds(new Set(ids));
      }
    } catch (error) {
      console.error(
        'Error loading shown contract IDs from sessionStorage:',
        error
      );
    }
  }, []);

  // Filter contracts that expire in exactly 30 days and haven't been shown
  const contractsToShow = useMemo(() => {
    // In test mode, return test contracts
    if (testMode && testContracts.length > 0) {
      return testContracts;
    }

    return files
      .map((file) => {
        const days = calculateDaysUntilExpiry(file.contractExpiryDate);
        return { file, days };
      })
      .filter(
        (item): item is { file: UIFileDoc; days: number } =>
          item.days !== null && item.days === 30
      )
      .filter((item) => !shownContractIds.has(item.file.$id))
      .map((item) => item.file);
  }, [files, shownContractIds, testMode, testContracts]);

  // Auto-open modal when contracts are detected
  useEffect(() => {
    if (contractsToShow.length > 0 && !isModalOpen && !testMode) {
      setIsModalOpen(true);
    }
  }, [contractsToShow.length, isModalOpen, testMode]);

  // Test function to trigger modal with mock data (development only)
  const triggerTestModal = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const testExpiryDate = new Date(today);
    testExpiryDate.setDate(today.getDate() + 30);

    const mockContract = {
      $id: 'test-contract-1',
      $collectionId: '',
      $databaseId: '',
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      $permissions: [],
      $sequence: 0,
      type: 'contract',
      extension: 'pdf',
      url: '',
      name: 'Test Contract - Vendor Services Agreement',
      size: 0,
      owner: 'Test User',
      users: [],
      contractName: 'Test Contract - Vendor Services Agreement',
      contractExpiryDate: testExpiryDate.toISOString().split('T')[0],
      status: 'active',
      contractType: 'Service Agreement',
      amount: 125000,
      vendor: 'Test Vendor Inc.',
      counterpartyLegalName: 'Test Vendor Inc.',
      counterpartyContactTitle: 'VP of Operations',
      counterpartyContactEmail: 'contact@testvendor.com',
      counterpartyContactPhone: '+1-555-0123',
      counterpartyAddress: '123 Business St, Suite 100, Miami, FL 33101',
    } as unknown as UIFileDoc & {
      counterpartyLegalName: string;
      counterpartyContactTitle: string;
      counterpartyContactEmail: string;
      counterpartyContactPhone: string;
      counterpartyAddress: string;
    };

    const mockContract2 = {
      $id: 'test-contract-2',
      $collectionId: '',
      $databaseId: '',
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      $permissions: [],
      $sequence: 0,
      type: 'contract',
      extension: 'docx',
      url: '',
      name: 'Test Contract - Software License Agreement',
      size: 0,
      owner: 'Another User',
      users: [],
      contractName: 'Test Contract - Software License Agreement',
      contractExpiryDate: testExpiryDate.toISOString().split('T')[0],
      status: 'pending-review',
      contractType: 'Software License',
      amount: 85000,
      vendor: 'Tech Solutions LLC',
      counterpartyLegalName: 'Tech Solutions LLC',
      counterpartyContactTitle: 'Head of Partnerships',
      counterpartyContactEmail: 'partnerships@techsolutions.com',
      counterpartyContactPhone: '+1-555-5678',
      counterpartyAddress:
        '456 Innovation Drive, Suite 200, San Jose, CA 95110',
    } as unknown as UIFileDoc & {
      counterpartyLegalName: string;
      counterpartyContactTitle: string;
      counterpartyContactEmail: string;
      counterpartyContactPhone: string;
      counterpartyAddress: string;
    };

    setTestContracts([mockContract, mockContract2]);
    setTestMode(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);

    // Mark contracts as shown in sessionStorage (only if not in test mode)
    if (
      typeof window !== 'undefined' &&
      !testMode &&
      contractsToShow.length > 0
    ) {
      try {
        const currentShown = Array.from(shownContractIds);
        const newShown = [
          ...currentShown,
          ...contractsToShow.map((file) => file.$id),
        ];
        const uniqueShown = Array.from(new Set(newShown));
        sessionStorage.setItem('expiryModalShown', JSON.stringify(uniqueShown));
        setShownContractIds(new Set(uniqueShown));
      } catch (error) {
        console.error(
          'Error saving shown contract IDs to sessionStorage:',
          error
        );
      }
    }

    // Reset test mode when closing
    if (testMode) {
      setTestMode(false);
      setTestContracts([]);
    }
  };

  return {
    contractsToShow,
    isModalOpen,
    closeModal,
    triggerTestModal,
  };
}

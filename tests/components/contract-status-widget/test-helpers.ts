import type { UIFileDoc } from '@/types/files';

/**
 * Helper functions and mock data for ContractStatusPieChart tests
 */

/**
 * Creates a mock contract with the specified properties
 */
export function createMockContract(
  overrides: Partial<UIFileDoc> = {}
): UIFileDoc {
  const now = new Date();
  const defaultExpiry = new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000);

  return {
    $id: `contract-${Math.random().toString(36).substr(2, 9)}`,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $collectionId: 'contracts',
    $databaseId: 'default-db',
    $sequence: 0,
    type: 'contract',
    extension: 'pdf',
    url: '',
    name: 'Test Contract',
    size: 0,
    owner: 'user-1',
    users: [],
    contractName: 'Test Contract',
    status: 'active',
    contractExpiryDate: defaultExpiry.toISOString(),
    isExpired: false,
    ...overrides,
  } as UIFileDoc;
}

/**
 * Creates an active contract (not expiring soon)
 */
export function createActiveContract(
  daysUntilExpiry: number = 200,
  overrides: Partial<UIFileDoc> = {}
): UIFileDoc {
  const expiryDate = new Date(
    Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000
  );

  return createMockContract({
    status: 'active',
    contractExpiryDate: expiryDate.toISOString(),
    isExpired: false,
    ...overrides,
  });
}

/**
 * Creates an expiring contract (within 90 days)
 */
export function createExpiringContract(
  daysUntilExpiry: number = 30,
  overrides: Partial<UIFileDoc> = {}
): UIFileDoc {
  const expiryDate = new Date(
    Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000
  );

  return createMockContract({
    status: 'active',
    contractExpiryDate: expiryDate.toISOString(),
    isExpired: false,
    ...overrides,
  });
}

/**
 * Creates a completed/inactive contract
 */
export function createCompletedContract(
  overrides: Partial<UIFileDoc> = {}
): UIFileDoc {
  return createMockContract({
    status: 'inactive',
    isExpired: false,
    ...overrides,
  });
}

/**
 * Creates an expired contract
 */
export function createExpiredContract(
  daysAgo: number = 10,
  overrides: Partial<UIFileDoc> = {}
): UIFileDoc {
  const expiryDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  return createMockContract({
    status: 'active',
    contractExpiryDate: expiryDate.toISOString(),
    isExpired: true,
    ...overrides,
  });
}

/**
 * Expected pie chart data structure
 */
export interface ExpectedPieChartData {
  active: number;
  expiring: number;
  completed: number;
  total: number;
}

/**
 * Calculates expected pie chart data from contracts
 */
export function calculateExpectedData(
  contracts: UIFileDoc[]
): ExpectedPieChartData {
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  let active = 0;
  let expiring = 0;
  let completed = 0;

  contracts.forEach((contract) => {
    const status = contract.status?.toLowerCase() || '';
    const expiryDate = contract.contractExpiryDate
      ? new Date(contract.contractExpiryDate)
      : null;
    const isExpired = contract.isExpired || false;

    if (status === 'active' && !isExpired) {
      if (expiryDate && expiryDate <= ninetyDaysFromNow && expiryDate >= now) {
        expiring++;
      } else {
        active++;
      }
    } else if (
      status === 'inactive' ||
      isExpired ||
      (expiryDate && expiryDate < now)
    ) {
      completed++;
    } else if (
      expiryDate &&
      expiryDate <= ninetyDaysFromNow &&
      expiryDate >= now
    ) {
      expiring++;
    } else if (status === 'active') {
      active++;
    } else {
      completed++;
    }
  });

  return {
    active,
    expiring,
    completed,
    total: active + expiring + completed,
  };
}

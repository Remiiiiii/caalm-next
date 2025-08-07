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

interface UseManagerContractsOptions {
  enableRealTime?: boolean;
  pollingInterval?: number;
}

export const useManagerContracts = ({
  enableRealTime = true,
  pollingInterval = 20000, // 20 seconds for contracts (less frequent)
}: UseManagerContractsOptions = {}) => {
  // Get current user first
  const { data: currentUser } = useSWR(
    swrKeys.currentUser(),
    swrConfig.fetcher || null,
    {
      ...swrConfig,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Use the global SWR key based on current user
  const key = currentUser?.$id
    ? swrKeys.managerContracts(currentUser.$id)
    : null;

  const {
    data: contractsData = [],
    error,
    isLoading,
    mutate,
  } = useSWR(key, swrConfig.fetcher || null, {
    ...swrConfig,
    refreshInterval: enableRealTime ? pollingInterval : 0,
  });

  // Ensure all contracts have the required properties
  const contracts = Array.isArray(contractsData)
    ? contractsData.map((contract: Contract) => ({
        ...contract,
        contractName:
          contract.contractName || contract.name || 'Unnamed Contract',
        name: contract.name || contract.contractName || 'Unnamed Contract',
        status: contract.status || 'pending',
      }))
    : [];

  const refresh = () => mutate();

  return {
    contracts,
    currentUser,
    isLoading,
    error: error ? 'Failed to load contracts' : null,
    lastUpdate: new Date(),
    refresh,
  };
};

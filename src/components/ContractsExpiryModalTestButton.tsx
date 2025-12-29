'use client';

import { Button } from '@/components/ui/button';
import { useContractExpiryModal } from '@/hooks/useContractExpiryModal';
import { useContractsExpiring } from '@/hooks/useContractsExpiring';
import ContractExpiryModal from '@/components/contract-expiry-modal/ContractExpiryModal';

export default function ContractsExpiryModalTestButton() {
  // Fetch contracts from /api/contracts/all endpoint
  const {
    contracts: contractsFromApi,
    isLoading: contractsLoading,
    refresh: refreshContracts,
  } = useContractsExpiring();

  // Contract expiry modal hook - uses contracts from /api/contracts/all
  const {
    contractsToShow,
    contractsWithDays,
    isModalOpen,
    closeModal,
    triggerTestModal,
    shouldPlaySpeech,
  } = useContractExpiryModal(contractsFromApi || []);

  // Handle contract status change - refresh contracts
  const handleContractStatusChange = () => {
    refreshContracts();
  };

  return (
    <>
      <Button
        onClick={triggerTestModal}
        variant="outline"
        size="sm"
        className="bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300 text-xs"
      >
        🧪 Test Expiry Modal
      </Button>
      <ContractExpiryModal
        contracts={contractsToShow}
        contractsWithDays={contractsWithDays}
        isOpen={isModalOpen}
        onClose={closeModal}
        onStatusChange={handleContractStatusChange}
        shouldPlaySpeech={shouldPlaySpeech}
      />
    </>
  );
}

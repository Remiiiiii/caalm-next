"use client";

import ContractExpiryModal from "@/components/contract-expiry-modal/ContractExpiryModal";
import { Button } from "@/components/ui/button";
import { useCombinedExpiryModal } from "@/hooks/useCombinedExpiryModal";
import { useContractsExpiring } from "@/hooks/useContractsExpiring";

export default function ContractsExpiryModalTestButton() {
	const {
		contracts: contractsFromApi,
		refresh: refreshContracts,
	} = useContractsExpiring();

	const {
		itemsToShow,
		isModalOpen,
		closeModal,
		triggerTestModal,
		markItemDismissed,
		refreshLicenses,
		shouldPlaySpeech,
	} = useCombinedExpiryModal(contractsFromApi || []);

	const handleStatusChange = () => {
		refreshContracts();
		void refreshLicenses();
	};

	return (
		<>
			<Button
				onClick={triggerTestModal}
				variant="outline"
				size="sm"
				className="bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300 text-xs"
			>
				Test Expiry Modal
			</Button>
			<ContractExpiryModal
				items={itemsToShow}
				isOpen={isModalOpen}
				onClose={closeModal}
				onStatusChange={handleStatusChange}
				onItemDismissed={markItemDismissed}
				shouldPlaySpeech={shouldPlaySpeech}
			/>
		</>
	);
}

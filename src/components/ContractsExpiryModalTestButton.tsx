"use client";

import ContractExpiryModal from "@/components/contract-expiry-modal/ContractExpiryModal";
import { Button } from "@/components/ui/button";
import { useCombinedExpiryModal } from "@/hooks/useCombinedExpiryModal";
import { useContractsExpiring } from "@/hooks/useContractsExpiring";

export default function ContractsExpiryModalTestButton() {
	const { contracts: contractsFromApi, refresh: refreshContracts } =
		useContractsExpiring();

	const {
		itemsToShow,
		isModalOpen,
		closeModal,
		parkModal,
		parkedSession,
		resumeIndex,
		resumeParkedSession,
		triggerDevTestModal,
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
				onClick={triggerDevTestModal}
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
				onParkSession={parkModal}
				initialIndex={resumeIndex}
				shouldPlaySpeech={shouldPlaySpeech}
			/>
			{parkedSession && !isModalOpen && (
				<button
					type="button"
					onClick={resumeParkedSession}
					className="fixed bottom-6 right-6 z-50 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#0f5384]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f5384] shadow-lg"
				>
					Resume expiry alerts ({parkedSession.count})
				</button>
			)}
		</>
	);
}

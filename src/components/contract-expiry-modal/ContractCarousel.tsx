"use client";

/**
 * @deprecated Prefer ExpiryCarousel — thin wrapper for any leftover imports.
 */
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";
import ExpiryCarousel from "./ExpiryCarousel";

interface ContractCarouselProps {
	contracts: UIFileDoc[];
	onDismiss: () => void;
	onContractDismissed?: (contractId: string) => void;
	onStatusChange?: () => void;
	shouldPlaySpeech?: boolean;
}

export default function ContractCarousel({
	contracts,
	onDismiss,
	onContractDismissed,
	onStatusChange,
	shouldPlaySpeech = true,
}: ContractCarouselProps) {
	const items: ExpiryQueueItem[] = contracts.map((file) => {
		let days = 0;
		if (file.contractExpiryDate) {
			try {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const expiryStr = file.contractExpiryDate.split("T")[0];
				const [year, month, day] = expiryStr.split("-").map(Number);
				const expiry = new Date(year, month - 1, day);
				expiry.setHours(0, 0, 0, 0);
				days = Math.ceil(
					(expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
				);
			} catch {
				days = 0;
			}
		}
		return { kind: "contract" as const, id: file.$id, file, days };
	});

	return (
		<ExpiryCarousel
			items={items}
			onDismiss={onDismiss}
			onItemDismissed={(item) => onContractDismissed?.(item.id)}
			onStatusChange={onStatusChange}
			shouldPlaySpeech={shouldPlaySpeech}
		/>
	);
}

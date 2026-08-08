"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ExpiryAlertModal, {
	type ExpirySnoozeDuration,
	formatExpiryTypeLabel,
	snoozeDurationToDays,
} from "@/components/expiry-alert-modal/ExpiryAlertModal";
import { useToast } from "@/hooks/use-toast";
import { useContractSnooze } from "@/hooks/useContractSnooze";
import { useUpdateContractStatus } from "@/hooks/useUpdateContractStatus";
import type { UIFileDoc } from "@/types/files";

type ContractExpiryAlertBridgeProps = {
	open: boolean;
	contract: UIFileDoc;
	daysRemaining: number;
	onClose: () => void;
	onContractHandled: (contractId: string) => void;
	onStatusChange?: () => void;
};

/**
 * Maps a contract UIFileDoc into ExpiryAlertModal and wires renew / snooze / let-expire.
 */
export default function ContractExpiryAlertBridge({
	open,
	contract,
	daysRemaining,
	onClose,
	onContractHandled,
	onStatusChange,
}: ContractExpiryAlertBridgeProps) {
	const router = useRouter();
	const { toast } = useToast();
	const { snoozeContract } = useContractSnooze();
	const { updateStatus } = useUpdateContractStatus({ onStatusChange });
	const [isBusy, setIsBusy] = useState(false);

	const title =
		contract.contractName || contract.name || "Untitled Contract";
	const expiryDate = contract.contractExpiryDate || "";
	const vendor =
		contract.vendor ||
		(contract as UIFileDoc & { counterpartyLegalName?: string })
			.counterpartyLegalName ||
		"—";

	const handleRenew = () => {
		router.push("/contracts");
		onContractHandled(contract.$id);
	};

	const handleViewDetails = () => {
		router.push(`/contracts?highlight=${encodeURIComponent(contract.$id)}`);
		onContractHandled(contract.$id);
	};

	const handleSnooze = async (duration: ExpirySnoozeDuration) => {
		if (!expiryDate) return;
		setIsBusy(true);
		try {
			const success = await snoozeContract({
				contractId: contract.$id,
				days: snoozeDurationToDays(duration),
				expiryDate,
			});
			if (success) {
				onStatusChange?.();
				onContractHandled(contract.$id);
			}
		} finally {
			setIsBusy(false);
		}
	};

	const handleLetExpire = async () => {
		setIsBusy(true);
		try {
			const success = await updateStatus({
				fileId: contract.$id,
				status: "inactive",
				path: "/dashboard",
			});
			if (success) {
				toast({
					title: "Contract marked inactive",
					description: "This contract will no longer appear as expiring.",
				});
				onContractHandled(contract.$id);
			}
		} finally {
			setIsBusy(false);
		}
	};

	const handleContactProvider = () => {
		const counterparty = contract as UIFileDoc & {
			counterpartyContactEmail?: string;
			counterpartyContactPhone?: string;
		};

		if (counterparty.counterpartyContactEmail) {
			window.location.href = `mailto:${counterparty.counterpartyContactEmail}`;
			return;
		}
		if (counterparty.counterpartyContactPhone) {
			window.location.href = `tel:${counterparty.counterpartyContactPhone}`;
			return;
		}
		toast({
			title: "Contact information not available",
			description: "No contact email or phone number found for this vendor.",
			variant: "destructive",
		});
	};

	return (
		<ExpiryAlertModal
			open={open}
			entityType="contract"
			title={title}
			expiryDate={expiryDate}
			daysRemaining={daysRemaining}
			amount={
				typeof contract.amount === "number" ? contract.amount : undefined
			}
			status={contract.status || "active"}
			typeLabel={formatExpiryTypeLabel(contract.contractType)}
			vendor={vendor}
			onRenew={handleRenew}
			onViewDetails={handleViewDetails}
			onSnooze={handleSnooze}
			onLetExpire={handleLetExpire}
			onContactProvider={handleContactProvider}
			onClose={onClose}
			isBusy={isBusy}
		/>
	);
}

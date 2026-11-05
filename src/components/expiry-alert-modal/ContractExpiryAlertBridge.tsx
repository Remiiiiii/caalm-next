"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ExpiryAlertModal from "@/components/expiry-alert-modal/ExpiryAlertModal";
import { useToast } from "@/hooks/use-toast";
import { useContractSnooze } from "@/hooks/useContractSnooze";
import { useUpdateContractStatus } from "@/hooks/useUpdateContractStatus";
import { EXPIRY_ALERT_SNOOZE_DAYS } from "@/lib/expiry/action-matrix";
import { toExpiryItemView } from "@/lib/expiry/expiry-item-view";
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
 * Legacy single-contract bridge (old API, still used by tests). Maps one
 * UIFileDoc into ExpiryAlertModal and wires renew / snooze / let-expire.
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

	const view = toExpiryItemView({
		kind: "contract",
		id: contract.$id,
		file: contract,
		days: daysRemaining,
	});

	const handleRenew = () => {
		router.push("/contracts");
		onContractHandled(contract.$id);
	};

	const handleViewDetails = () => {
		router.push(`/contracts?highlight=${encodeURIComponent(contract.$id)}`);
		onContractHandled(contract.$id);
	};

	const handleSnooze = async () => {
		if (!view.expiresAt) return;
		setIsBusy(true);
		try {
			const success = await snoozeContract({
				contractId: contract.$id,
				days: EXPIRY_ALERT_SNOOZE_DAYS,
				expiryDate: view.expiresAt,
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
		if (view.contact?.email) {
			window.location.href = `mailto:${view.contact.email}`;
			return;
		}
		if (view.contact?.phone) {
			window.location.href = `tel:${view.contact.phone}`;
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
			title={view.title}
			expiryDate={view.expiresAt}
			daysRemaining={view.days}
			amount={view.amount}
			amountLabel={view.amountLabel}
			status={view.status}
			contactEmail={view.contact?.email}
			contactPhone={view.contact?.phone}
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

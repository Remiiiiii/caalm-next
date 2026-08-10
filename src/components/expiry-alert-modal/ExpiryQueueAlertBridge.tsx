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
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";

type ExpiryQueueAlertBridgeProps = {
	item: ExpiryQueueItem;
	onClose: () => void;
	onItemHandled: (item: ExpiryQueueItem) => void;
	onStatusChange?: () => void;
};

function parseAmount(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number.parseFloat(value);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

/**
 * Single ExpiryAlertModal for carousel slides.
 * Shell (backdrop / Spline / close) stays mounted; only contentKey changes.
 */
export default function ExpiryQueueAlertBridge({
	item,
	onClose,
	onItemHandled,
	onStatusChange,
}: ExpiryQueueAlertBridgeProps) {
	const router = useRouter();
	const { toast } = useToast();
	const { snoozeContract } = useContractSnooze();
	const { updateStatus } = useUpdateContractStatus({ onStatusChange });
	const [isBusy, setIsBusy] = useState(false);

	const contentKey = `${item.kind}:${item.id}`;

	if (item.kind === "contract") {
		const contract = item.file;
		const title =
			contract.contractName || contract.name || "Untitled Contract";
		const expiryDate = contract.contractExpiryDate || "";
		const vendor =
			contract.vendor ||
			(contract as UIFileDoc & { counterpartyLegalName?: string })
				.counterpartyLegalName ||
			"";

		const handleRenew = () => {
			router.push("/contracts");
			onItemHandled(item);
		};

		const handleViewDetails = () => {
			router.push(
				`/contracts?highlight=${encodeURIComponent(contract.$id)}`,
			);
			onItemHandled(item);
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
					onItemHandled(item);
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
					onItemHandled(item);
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
				open
				contentKey={contentKey}
				entityType="contract"
				title={title}
				expiryDate={expiryDate}
				daysRemaining={item.days}
				amount={parseAmount(contract.amount)}
				status={contract.status || "active"}
				typeLabel={formatExpiryTypeLabel(contract.contractType)}
				vendor={vendor || "—"}
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

	const license = item.license;
	const title = license.licenseName || "Untitled License";
	const expiryDate = license.licenseExpiryDate || license.expirationDate || "";
	const vendor = license.vendor || license.issuingAuthority || "";
	const amount = parseAmount(
		(license as License & { amount?: number }).amount ?? license.cost,
	);

	const handleRenew = () => {
		router.push(`/licenses?highlight=${encodeURIComponent(license.$id)}`);
		onItemHandled(item);
	};

	const handleViewDetails = () => {
		router.push(`/licenses?highlight=${encodeURIComponent(license.$id)}`);
		onItemHandled(item);
	};

	const handleSnooze = async (_duration: ExpirySnoozeDuration) => {
		setIsBusy(true);
		try {
			toast({
				title: "Reminder snoozed",
				description:
					"This license won't show again until you start a new session.",
			});
			onStatusChange?.();
			onItemHandled(item);
		} finally {
			setIsBusy(false);
		}
	};

	const handleLetExpire = async () => {
		setIsBusy(true);
		try {
			toast({
				title: "Reminder dismissed",
				description:
					"This license won't show again until you start a new session.",
			});
			onStatusChange?.();
			onItemHandled(item);
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<ExpiryAlertModal
			open
			contentKey={contentKey}
			entityType="license"
			title={title}
			expiryDate={expiryDate}
			daysRemaining={item.days}
			amount={amount}
			status={license.status || "active"}
			typeLabel={formatExpiryTypeLabel(license.licenseType)}
			vendor={vendor || "—"}
			onRenew={handleRenew}
			onViewDetails={handleViewDetails}
			onSnooze={handleSnooze}
			onLetExpire={handleLetExpire}
			onClose={onClose}
			isBusy={isBusy}
		/>
	);
}

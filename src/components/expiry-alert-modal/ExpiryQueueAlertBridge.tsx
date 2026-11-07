"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExpiryAlertModal, {
	type ExpiryNarration,
	type ExpiryQueue,
} from "@/components/expiry-alert-modal/ExpiryAlertModal";
import { useToast } from "@/hooks/use-toast";
import { useContractSnooze } from "@/hooks/useContractSnooze";
import { useUpdateContractStatus } from "@/hooks/useUpdateContractStatus";
import { resolveContractSnoozeDays } from "@/lib/expiry/action-matrix";
import { toExpiryItemView } from "@/lib/expiry/expiry-item-view";
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import { DESKTOP_MIN_WIDTH } from "@/lib/ui/desktop-first";

type ExpiryQueueAlertBridgeProps = {
	item: ExpiryQueueItem;
	onClose: () => void;
	onItemHandled: (item: ExpiryQueueItem) => void;
	/** Park the queue (keep items) and leave for Contracts/Licenses. */
	onParkSession?: () => void;
	onStatusChange?: () => void;
	queuePosition?: { index: number; total: number };
	onPrev?: () => void;
	onNext?: () => void;
	narration?: ExpiryNarration | null;
	queue?: ExpiryQueue | null;
};

/** Reactive "is this a phone" check so the Renew note updates on resize. */
function useIsPhoneViewport() {
	const [isPhone, setIsPhone] = useState(false);
	useEffect(() => {
		const check = () => setIsPhone(window.innerWidth < DESKTOP_MIN_WIDTH);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);
	return isPhone;
}

function workspaceHref(item: ExpiryQueueItem): string {
	return item.kind === "contract"
		? `/contracts/${item.id}/details?fromAlert=1`
		: `/licenses/${item.id}/details?fromAlert=1`;
}

/**
 * Adapter: turns one queue item into ExpiryAlertModal content + handlers. The
 * shell (band / narration / queue) stays mounted; only the body changes per
 * slide via contentKey.
 */
export default function ExpiryQueueAlertBridge({
	item,
	onClose,
	onItemHandled,
	onParkSession,
	onStatusChange,
	queuePosition,
	onPrev,
	onNext,
	narration,
	queue,
}: ExpiryQueueAlertBridgeProps) {
	const router = useRouter();
	const { toast } = useToast();
	const { snoozeContract } = useContractSnooze();
	const { updateStatus } = useUpdateContractStatus({ onStatusChange });
	const [isBusy, setIsBusy] = useState(false);
	const isPhone = useIsPhoneViewport();

	const view = toExpiryItemView(item);
	const contentKey = `${item.kind}:${item.id}`;

	const handleOpenInWorkspace = () => {
		onParkSession?.();
		router.push(workspaceHref(item));
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
			description: "No contact email or phone number found for this record.",
			variant: "destructive",
		});
	};

	const sharedModalProps = {
		open: true as const,
		contentKey,
		entityId: item.id,
		title: view.title,
		expiryDate: view.expiresAt,
		daysRemaining: view.days,
		amount: view.amount,
		amountLabel: view.amountLabel,
		status: view.status,
		typeLabel: view.typeLabel,
		contactEmail: view.contact?.email,
		contactPhone: view.contact?.phone,
		vendor: view.vendor,
		department: view.department,
		referenceNumber: view.referenceNumber,
		issuingAuthority: view.issuingAuthority,
		fileUrl: view.fileUrl,
		division: view.division,
		uploadedById: view.uploadedById,
		assignedManagerIds: view.assignedManagerIds,
		aiSynopsis: view.aiSynopsis,
		aiSynopsisGeneratedAt: view.aiSynopsisGeneratedAt,
		renewing: view.renewing,
		renewRequiresDesktop: isPhone,
		onOpenInWorkspace: handleOpenInWorkspace,
		onContactProvider: handleContactProvider,
		onClose,
		isBusy,
		queuePosition,
		onPrev,
		onNext,
		narration,
		queue,
	};

	if (item.kind === "contract") {
		const handleRenew = () => {
			router.push("/contracts");
			onItemHandled(item);
		};

		const handleSnooze = async () => {
			if (!view.expiresAt) return;
			const days = resolveContractSnoozeDays(view.days);
			if (days == null) return;
			setIsBusy(true);
			try {
				const success = await snoozeContract({
					contractId: item.id,
					days,
					expiryDate: view.expiresAt,
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
					fileId: item.id,
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

		return (
			<ExpiryAlertModal
				{...sharedModalProps}
				entityType="contract"
				onRenew={handleRenew}
				onSnooze={handleSnooze}
				onLetExpire={handleLetExpire}
			/>
		);
	}

	// License — renew / dismiss only (no date snooze, no inactive).
	const handleRenew = () => {
		router.push("/licenses");
		onItemHandled(item);
	};

	const handleDismiss = () => {
		toast({
			title: "Reminder dismissed",
			description:
				"This license won't show again until you start a new session.",
		});
		onStatusChange?.();
		onItemHandled(item);
	};

	return (
		<ExpiryAlertModal
			{...sharedModalProps}
			entityType="license"
			onRenew={handleRenew}
			onDismiss={handleDismiss}
		/>
	);
}

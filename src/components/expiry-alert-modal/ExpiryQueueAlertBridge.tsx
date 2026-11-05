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
import { EXPIRY_ALERT_SNOOZE_DAYS } from "@/lib/expiry/action-matrix";
import { toExpiryItemView } from "@/lib/expiry/expiry-item-view";
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import { DESKTOP_MIN_WIDTH } from "@/lib/ui/desktop-first";

type ExpiryQueueAlertBridgeProps = {
	item: ExpiryQueueItem;
	onClose: () => void;
	onItemHandled: (item: ExpiryQueueItem) => void;
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

/**
 * Adapter: turns one queue item into ExpiryAlertModal content + handlers. The
 * shell (band / narration / queue) stays mounted; only the body changes per
 * slide via contentKey.
 */
export default function ExpiryQueueAlertBridge({
	item,
	onClose,
	onItemHandled,
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

	const handleViewDetails = () => {
		const href =
			item.kind === "contract"
				? `/contracts?highlight=${encodeURIComponent(item.id)}`
				: `/licenses?highlight=${encodeURIComponent(item.id)}`;
		router.push(href);
		onItemHandled(item);
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

	if (item.kind === "contract") {
		const handleRenew = () => {
			router.push("/contracts");
			onItemHandled(item);
		};

		const handleSnooze = async () => {
			if (!view.expiresAt) return;
			setIsBusy(true);
			try {
				const success = await snoozeContract({
					contractId: item.id,
					days: EXPIRY_ALERT_SNOOZE_DAYS,
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
				open
				contentKey={contentKey}
				entityType="contract"
				title={view.title}
				expiryDate={view.expiresAt}
				daysRemaining={view.days}
				amount={view.amount}
				amountLabel={view.amountLabel}
				status={view.status}
				contactEmail={view.contact?.email}
				contactPhone={view.contact?.phone}
				renewing={view.renewing}
				renewRequiresDesktop={isPhone}
				onRenew={handleRenew}
				onViewDetails={handleViewDetails}
				onSnooze={handleSnooze}
				onLetExpire={handleLetExpire}
				onContactProvider={handleContactProvider}
				onClose={onClose}
				isBusy={isBusy}
				queuePosition={queuePosition}
				onPrev={onPrev}
				onNext={onNext}
				narration={narration}
				queue={queue}
			/>
		);
	}

	// License — renew / view / dismiss only (no date snooze, no inactive).
	const handleRenew = () => {
		router.push(`/licenses?highlight=${encodeURIComponent(item.id)}`);
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
			open
			contentKey={contentKey}
			entityType="license"
			title={view.title}
			expiryDate={view.expiresAt}
			daysRemaining={view.days}
			amount={view.amount}
			amountLabel={view.amountLabel}
			status={view.status}
			renewing={view.renewing}
			renewRequiresDesktop={isPhone}
			onRenew={handleRenew}
			onViewDetails={handleViewDetails}
			onDismiss={handleDismiss}
			onContactProvider={handleContactProvider}
			onClose={onClose}
			isBusy={isBusy}
			queuePosition={queuePosition}
			onPrev={onPrev}
			onNext={onNext}
			narration={narration}
			queue={queue}
		/>
	);
}

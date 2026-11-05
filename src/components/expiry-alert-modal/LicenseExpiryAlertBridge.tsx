"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ExpiryAlertModal from "@/components/expiry-alert-modal/ExpiryAlertModal";
import { useToast } from "@/hooks/use-toast";
import { toExpiryItemView } from "@/lib/expiry/expiry-item-view";
import type { License } from "@/types/licenses";

type LicenseExpiryAlertBridgeProps = {
	open: boolean;
	license: License;
	daysRemaining: number;
	onClose: () => void;
	onLicenseHandled: (licenseId: string) => void;
	onStatusChange?: () => void;
};

/**
 * Legacy single-license bridge (old API, still used by tests). Licenses can't
 * be snoozed by date or marked inactive — the only deferral is a session
 * dismiss until a license snooze API exists.
 */
export default function LicenseExpiryAlertBridge({
	open,
	license,
	daysRemaining,
	onClose,
	onLicenseHandled,
	onStatusChange,
}: LicenseExpiryAlertBridgeProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [isBusy, setIsBusy] = useState(false);

	const view = toExpiryItemView({
		kind: "license",
		id: license.$id,
		license,
		days: daysRemaining,
	});

	const handleRenew = () => {
		router.push(`/licenses?highlight=${encodeURIComponent(license.$id)}`);
		onLicenseHandled(license.$id);
	};

	const handleViewDetails = () => {
		router.push(`/licenses?highlight=${encodeURIComponent(license.$id)}`);
		onLicenseHandled(license.$id);
	};

	const handleDismiss = () => {
		setIsBusy(true);
		try {
			toast({
				title: "Reminder dismissed",
				description:
					"This license won't show again until you start a new session.",
			});
			onStatusChange?.();
			onLicenseHandled(license.$id);
		} finally {
			setIsBusy(false);
		}
	};

	return (
		<ExpiryAlertModal
			open={open}
			entityType="license"
			title={view.title}
			expiryDate={view.expiresAt}
			daysRemaining={view.days}
			amount={view.amount}
			amountLabel={view.amountLabel}
			status={view.status}
			renewing={view.renewing}
			onRenew={handleRenew}
			onViewDetails={handleViewDetails}
			onDismiss={handleDismiss}
			onClose={onClose}
			isBusy={isBusy}
		/>
	);
}

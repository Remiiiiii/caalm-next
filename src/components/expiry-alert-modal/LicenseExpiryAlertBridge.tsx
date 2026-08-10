"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ExpiryAlertModal, {
	type ExpirySnoozeDuration,
	formatExpiryTypeLabel,
} from "@/components/expiry-alert-modal/ExpiryAlertModal";
import { useToast } from "@/hooks/use-toast";
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
 * Maps a License into ExpiryAlertModal.
 * Snooze / dismiss are session-scoped until a license snooze API exists.
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

	const title = license.licenseName || "Untitled License";
	const expiryDate =
		license.licenseExpiryDate || license.expirationDate || "";
	const vendor = license.vendor || license.issuingAuthority || "";

	const amountRaw = (license as License & { amount?: number }).amount ?? license.cost;
	const amount =
		typeof amountRaw === "number" && Number.isFinite(amountRaw)
			? amountRaw
			: undefined;

	const handleRenew = () => {
		router.push(`/licenses?highlight=${encodeURIComponent(license.$id)}`);
		onLicenseHandled(license.$id);
	};

	const handleViewDetails = () => {
		router.push(`/licenses?highlight=${encodeURIComponent(license.$id)}`);
		onLicenseHandled(license.$id);
	};

	const handleSnooze = async (_duration: ExpirySnoozeDuration) => {
		setIsBusy(true);
		try {
			toast({
				title: "Reminder snoozed",
				description: "This license won't show again until you start a new session.",
			});
			onStatusChange?.();
			onLicenseHandled(license.$id);
		} finally {
			setIsBusy(false);
		}
	};

	const handleLetExpire = async () => {
		setIsBusy(true);
		try {
			toast({
				title: "Reminder dismissed",
				description: "This license won't show again until you start a new session.",
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
			title={title}
			expiryDate={expiryDate}
			daysRemaining={daysRemaining}
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

"use client";

import { motion } from "framer-motion";
import { Clock, Eye, Mail, RefreshCw, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useContractSnooze } from "@/hooks/useContractSnooze";
import { useUpdateContractStatus } from "@/hooks/useUpdateContractStatus";
import type { UIFileDoc } from "@/types/files";
import { ExpirationAttestationDialog } from "@/components/approvals/ExpirationAttestationDialog";
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog";
import ContractDismissalSignatureModal from "./ContractDismissalSignatureModal";

interface ExpiryActionButtonsProps {
	contract: UIFileDoc;
	onDismiss: () => void;
	onStatusChange?: () => void;
	daysUntilExpiry?: number | null;
}

export default function ExpiryActionButtons({
	contract,
	onDismiss,
	onStatusChange,
	daysUntilExpiry,
}: ExpiryActionButtonsProps) {
	const { toast } = useToast();
	const { updateStatus } = useUpdateContractStatus({ onStatusChange });
	const { snoozeContract } = useContractSnooze();
	const [showAttestDialog, setShowAttestDialog] = useState(false);
	const [showRenewDialog, setShowRenewDialog] = useState(false);
	const [showSignatureModal, setShowSignatureModal] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isSnoozing, setIsSnoozing] = useState(false);

	// Calculate days until expiry if not provided
	const days = useMemo(() => {
		if (daysUntilExpiry !== undefined && daysUntilExpiry !== null) {
			return daysUntilExpiry;
		}
		if (!contract.contractExpiryDate) return null;

		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const expiryStr = contract.contractExpiryDate.split("T")[0];
			const [year, month, day] = expiryStr.split("-").map(Number);
			const expiry = new Date(year, month - 1, day);
			expiry.setHours(0, 0, 0, 0);
			const diffTime = expiry.getTime() - today.getTime();
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		} catch {
			return null;
		}
	}, [daysUntilExpiry, contract.contractExpiryDate]);

	// Determine snooze options based on days
	const snoozeOptions = useMemo(() => {
		if (days === null || !contract.contractExpiryDate) return null;

		if (days === 30) {
			// 30 days: Single button, auto-snooze until 10 days before expiry
			return { type: "button" as const, days: 20 }; // 30 - 10 = 20 days to snooze
		} else if (days === 15) {
			// 15 days: Dropdown with 1-5 days
			return {
				type: "dropdown" as const,
				options: [1, 2, 3, 4, 5],
			};
		} else if (days === 10) {
			// 10 days: Dropdown with 1-9 days
			return {
				type: "dropdown" as const,
				options: [1, 2, 3, 4, 5, 6, 7, 8, 9],
			};
		} else if (days < 10 && days > 1) {
			// 9-2 days: Dropdown with 1 to (days - 1) days (cannot snooze past 24-hour mark)
			const maxDays = Math.max(1, Math.min(days - 1, 9));
			if (maxDays < 1) return null;
			return {
				type: "dropdown" as const,
				options: Array.from({ length: maxDays }, (_, i) => i + 1),
			};
		}

		return null; // No snooze available
	}, [days, contract.contractExpiryDate]);

	const handleSnooze = async (snoozeDays?: number) => {
		if (!contract.contractExpiryDate) return;

		setIsSnoozing(true);
		try {
			let daysToSnooze: number;

			if (snoozeDays) {
				daysToSnooze = snoozeDays;
			} else if (snoozeOptions?.type === "button" && days === 30) {
				// At 30 days, snooze until 10 days before expiry
				const expiry = new Date(contract.contractExpiryDate);
				expiry.setHours(0, 0, 0, 0);
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const tenDaysBefore = new Date(expiry);
				tenDaysBefore.setDate(expiry.getDate() - 10);
				const diffTime = tenDaysBefore.getTime() - today.getTime();
				daysToSnooze = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			} else if (snoozeOptions?.type === "button") {
				daysToSnooze = snoozeOptions.days;
			} else {
				daysToSnooze = 1;
			}

			const success = await snoozeContract({
				contractId: contract.$id,
				days: daysToSnooze,
				expiryDate: contract.contractExpiryDate,
			});

			if (success) {
				onStatusChange?.();
				onDismiss();
			}
		} catch (error) {
			console.error("Failed to snooze contract:", error);
		} finally {
			setIsSnoozing(false);
		}
	};

	const handleDismissClick = () => {
		setShowSignatureModal(true);
	};

	const handleSignatureSuccess = () => {
		// Mark this specific contract as dismissed
		if (typeof window !== "undefined") {
			try {
				const stored = sessionStorage.getItem("expiryModalShown");
				const currentShown = stored ? JSON.parse(stored) : [];
				if (!currentShown.includes(contract.$id)) {
					currentShown.push(contract.$id);
					sessionStorage.setItem(
						"expiryModalShown",
						JSON.stringify(currentShown),
					);
				}
			} catch (error) {
				console.error("Error saving dismissed contract:", error);
			}
		}
		onStatusChange?.();
		onDismiss();
	};

	const handleRenewContract = () => {
		setShowRenewDialog(true);
	};

	const handleLetExpire = async () => {
		setIsUpdating(true);
		try {
			const success = await updateStatus({
				fileId: contract.$id,
				status: "inactive",
				path: "/dashboard",
			});
			if (success) {
				setShowLetExpireDialog(false);
				onDismiss();
			}
		} catch (error) {
			console.error("Failed to update contract status:", error);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleViewDetails = () => {
		// Navigate to contract details - check if there's a specific contract details route
		// For now, navigate to contracts page
		router.push(`/contracts`);
		onDismiss();
	};

	const handleContactProvider = () => {
		// Access counterparty email if available
		const counterparty = contract as UIFileDoc & {
			counterpartyContactEmail?: string;
			counterpartyContactPhone?: string;
		};

		if (counterparty.counterpartyContactEmail) {
			window.location.href = `mailto:${counterparty.counterpartyContactEmail}`;
		} else if (counterparty.counterpartyContactPhone) {
			window.location.href = `tel:${counterparty.counterpartyContactPhone}`;
		} else {
			toast({
				title: "Contact information not available",
				description: "No contact email or phone number found for this vendor.",
				variant: "destructive",
			});
		}
	};

	const buttonVariants = {
		hover: { scale: 1.05, transition: { duration: 0.2 } },
		tap: { scale: 0.95 },
	};

	return (
		<>
			<motion.div
				initial={{ opacity: 0, y: 50 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 1.5, duration: 0.5 }}
				className="relative z-20 mt-8 flex flex-nowrap gap-3 w-fit ml-24"
			>
				<motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
					<Button
						onClick={handleRenewContract}
						className="bg-blue hover:bg-blue text-white shadow-lg hover:shadow-xl transition-all"
						size="lg"
					>
						<RotateCcw className="w-4 h-4 mr-2" />
						Renew Contract
					</Button>
				</motion.div>

				<motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
					<Button
						onClick={() => setShowAttestDialog(true)}
						variant="outline"
						className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
						size="lg"
					>
						<X className="w-4 h-4 mr-2" />
						Let Expire
					</Button>
				</motion.div>

				<motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
					<Button
						onClick={handleViewDetails}
						variant="outline"
						className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
						size="lg"
					>
						<Eye className="w-4 h-4 mr-2" />
						View Details
					</Button>
				</motion.div>

				<motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
					<Button
						onClick={handleContactProvider}
						variant="outline"
						className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
						size="lg"
					>
						<Mail className="w-4 h-4 mr-2" />
						Contact Provider
					</Button>
				</motion.div>

				{/* Snooze Button/Dropdown */}
				{snoozeOptions && (
					<motion.div
						variants={buttonVariants}
						whileHover="hover"
						whileTap="tap"
					>
						{snoozeOptions.type === "button" ? (
							<Button
								onClick={() => handleSnooze()}
								variant="outline"
								className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
								size="lg"
								disabled={isSnoozing}
							>
								<Clock className="w-4 h-4 mr-2" />
								{isSnoozing ? "Snoozing..." : "Snooze"}
							</Button>
						) : (
							<Select
								onValueChange={(value) => handleSnooze(parseInt(value, 10))}
								disabled={isSnoozing}
							>
								<SelectTrigger className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all h-12 min-w-[140px]">
									<Clock className="w-4 h-4 mr-2" />
									<SelectValue placeholder="Snooze" />
								</SelectTrigger>
								<SelectContent>
									{snoozeOptions.options.map((day) => (
										<SelectItem key={day} value={day.toString()}>
											{day} {day === 1 ? "day" : "days"}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</motion.div>
				)}

				<motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
					<Button
						onClick={handleDismissClick}
						variant="outline"
						className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
						size="lg"
					>
						Dismiss
					</Button>
				</motion.div>
			</motion.div>

			{/* Signature Modal */}
			<ExpirationAttestationDialog
				open={showAttestDialog}
				onOpenChange={setShowAttestDialog}
				entityType="contract"
				entityId={contract.$id}
				entityName={
					contract.contractName || contract.name || "Untitled Contract"
				}
				priorExpiryDate={contract.contractExpiryDate}
				phase="pre_expiry"
				onSuccess={() => {
					void handleLetExpire();
				}}
			/>
			<ContractRenewalDialog
				open={showRenewDialog}
				onOpenChange={setShowRenewDialog}
				contractId={contract.$id}
				contractName={
					contract.contractName || contract.name || "Untitled Contract"
				}
				onSuccess={() => {
					onStatusChange?.();
					onDismiss();
				}}
			/>
			<ContractDismissalSignatureModal
				isOpen={showSignatureModal}
				onClose={() => setShowSignatureModal(false)}
				contract={contract}
				onSuccess={handleSignatureSuccess}
			/>
		</>
	);
}

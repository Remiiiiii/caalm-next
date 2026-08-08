"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { UIFileDoc } from "@/types/files";
import ContractCarousel from "./ContractCarousel";

interface ContractExpiryModalProps {
	contracts: UIFileDoc[];
	contractsWithDays?: Array<{ file: UIFileDoc; days: number | null }>;
	isOpen: boolean;
	onClose: () => void;
	onStatusChange?: () => void;
	shouldPlaySpeech?: boolean;
}

/**
 * Shell for one or more contract expiry alerts.
 * Renders ExpiryAlertModal (via ContractCarousel) for each item.
 * X / dismiss = suppress for this browser session only (see useContractExpiryModal).
 */
export default function ContractExpiryModal({
	contracts,
	isOpen,
	onClose,
	onStatusChange,
	shouldPlaySpeech = true,
}: ContractExpiryModalProps) {
	const [isDesktop, setIsDesktop] = useState(false);
	const [dismissedContractIds, setDismissedContractIds] = useState<Set<string>>(
		new Set(),
	);
	const previousActiveElement = useRef<HTMLElement | null>(null);

	const activeContracts = contracts.filter(
		(contract) => !dismissedContractIds.has(contract.$id),
	);

	const handleContractDismissed = (contractId: string) => {
		setDismissedContractIds((prev) => new Set(prev).add(contractId));
		onStatusChange?.();

		const remaining = contracts.filter(
			(c) => c.$id !== contractId && !dismissedContractIds.has(c.$id),
		);
		if (remaining.length === 0) {
			onClose();
		}
	};

	useEffect(() => {
		const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
		checkDesktop();
		window.addEventListener("resize", checkDesktop);
		return () => window.removeEventListener("resize", checkDesktop);
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		previousActiveElement.current = document.activeElement as HTMLElement;
		return () => {
			previousActiveElement.current?.focus();
		};
	}, [isOpen]);

	if (!isDesktop) return null;
	if (!isOpen || activeContracts.length === 0) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-9999"
				>
					<ContractCarousel
						contracts={activeContracts}
						onDismiss={onClose}
						onContractDismissed={handleContractDismissed}
						onStatusChange={onStatusChange}
						shouldPlaySpeech={shouldPlaySpeech}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

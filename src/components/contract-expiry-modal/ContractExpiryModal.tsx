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

export default function ContractExpiryModal({
	contracts,
	contractsWithDays,
	isOpen,
	onClose,
	onStatusChange,
	shouldPlaySpeech = true,
}: ContractExpiryModalProps) {
	const [isDesktop, setIsDesktop] = useState(false);
	const [dismissedContractIds, setDismissedContractIds] = useState<Set<string>>(
		new Set(),
	);
	const modalRef = useRef<HTMLDivElement>(null);
	const previousActiveElement = useRef<HTMLElement | null>(null);

	// Filter out dismissed contracts
	const activeContracts = contracts.filter(
		(contract) => !dismissedContractIds.has(contract.$id),
	);

	// Handle contract dismissal - remove from list instead of closing modal
	const handleContractDismissed = (contractId: string) => {
		setDismissedContractIds((prev) => new Set(prev).add(contractId));
		onStatusChange?.();

		// Only close modal if all contracts are dismissed
		const remainingContracts = contracts.filter(
			(c) => c.$id !== contractId && !dismissedContractIds.has(c.$id),
		);
		if (remainingContracts.length === 0) {
			onClose();
		}
	};

	// Desktop-only check
	useEffect(() => {
		const checkDesktop = () => {
			setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
		};

		checkDesktop();
		window.addEventListener("resize", checkDesktop);
		return () => window.removeEventListener("resize", checkDesktop);
	}, []);

	// ESC key handler
	useEffect(() => {
		if (!isOpen) return;

		const handleEsc = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEsc);
		return () => document.removeEventListener("keydown", handleEsc);
	}, [isOpen, onClose]);

	// Focus trap
	useEffect(() => {
		if (!isOpen || !modalRef.current) return;

		// Store the previously active element
		previousActiveElement.current = document.activeElement as HTMLElement;

		// Focus the modal
		const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);

		const firstElement = focusableElements[0];
		if (firstElement) {
			firstElement.focus();
		}

		// Handle tab navigation within modal
		const handleTab = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return;

			const elements = Array.from(focusableElements) as HTMLElement[];
			const first = elements[0];
			const last = elements[elements.length - 1];

			if (event.shiftKey) {
				if (document.activeElement === first) {
					event.preventDefault();
					last?.focus();
				}
			} else {
				if (document.activeElement === last) {
					event.preventDefault();
					first?.focus();
				}
			}
		};

		document.addEventListener("keydown", handleTab);

		return () => {
			document.removeEventListener("keydown", handleTab);
			// Restore focus to previous element
			previousActiveElement.current?.focus();
		};
	}, [isOpen]);

	// Prevent body scroll when modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	// Don't render on mobile
	if (!isDesktop) {
		return null;
	}

	if (!isOpen || activeContracts.length === 0) {
		return null;
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<div
					className="fixed inset-0 z-[9999]"
					role="dialog"
					aria-modal="true"
					aria-labelledby="contract-expiry-modal-title"
					aria-describedby="contract-expiry-modal-description"
				>
					{/* Light backdrop - allows Spline scene to show through */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="fixed inset-0 bg-white/40 backdrop-blur-sm"
						onClick={onClose}
						aria-hidden="true"
					/>

					{/* Modal Content */}
					<div
						ref={modalRef}
						className="fixed inset-0 flex items-center justify-center pointer-events-none"
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ duration: 0.3, delay: 0.1 }}
							className="relative w-full h-full pointer-events-auto"
						>
							{/* Carousel Container */}
							<div className="w-full h-full">
								<ContractCarousel
									contracts={activeContracts}
									onDismiss={onClose}
									onContractDismissed={handleContractDismissed}
									onStatusChange={onStatusChange}
									shouldPlaySpeech={shouldPlaySpeech}
								/>
							</div>

							{/* Hidden labels for accessibility */}
							<h2 id="contract-expiry-modal-title" className="sr-only">
								Contract Expiry Notification
							</h2>
							<p id="contract-expiry-modal-description" className="sr-only">
								{activeContracts.length === 1
									? `Contract "${
											activeContracts[0].contractName || "Untitled"
										}" expires in 30 days.`
									: `${activeContracts.length} contracts expire in 30 days.`}
							</p>
						</motion.div>
					</div>
				</div>
			)}
		</AnimatePresence>
	);
}

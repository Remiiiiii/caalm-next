"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ContractExpiryAlertBridge from "@/components/expiry-alert-modal/ContractExpiryAlertBridge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import { formatContractForSpeech } from "@/lib/contract-speech";
import type { UIFileDoc } from "@/types/files";

interface ContractCarouselProps {
	contracts: UIFileDoc[];
	onDismiss: () => void;
	onContractDismissed?: (contractId: string) => void;
	onStatusChange?: () => void;
	shouldPlaySpeech?: boolean;
}

export default function ContractCarousel({
	contracts,
	onDismiss,
	onContractDismissed,
	onStatusChange,
	shouldPlaySpeech = true,
}: ContractCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const { generateSpeech, play, pause, stop, isPlaying, isLoading } =
		useElevenLabsTTS({ autoPlay: true });
	const { user } = useAuth();
	const generatedForRef = useRef<string | null>(null);
	const playedContractsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (contracts.length > 0) {
			if (currentIndex >= contracts.length) {
				setCurrentIndex(Math.max(0, contracts.length - 1));
			}
		} else {
			setCurrentIndex(0);
		}
	}, [contracts.length, currentIndex]);

	const currentContract = contracts[currentIndex];

	const currentContractDays = useMemo(() => {
		if (!currentContract?.contractExpiryDate) return 0;
		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const expiryStr = currentContract.contractExpiryDate.split("T")[0];
			const [year, month, day] = expiryStr.split("-").map(Number);
			const expiry = new Date(year, month - 1, day);
			expiry.setHours(0, 0, 0, 0);
			const diffTime = expiry.getTime() - today.getTime();
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		} catch {
			return 0;
		}
	}, [currentContract?.contractExpiryDate]);

	const userFullName =
		(user as { fullName?: string; name?: string } | null)?.fullName ||
		(user as { name?: string } | null)?.name ||
		user?.name ||
		"";

	useEffect(() => {
		return () => {
			stop();
			generatedForRef.current = null;
			playedContractsRef.current.clear();
		};
	}, [stop]);

	useEffect(() => {
		if (!currentContract || !shouldPlaySpeech) return;

		const contractKey = `${currentContract.$id}-${currentIndex}`;
		if (generatedForRef.current === contractKey) return;
		if (playedContractsRef.current.has(currentContract.$id)) return;

		stop();
		generatedForRef.current = null;

		const text = formatContractForSpeech({
			contract: currentContract,
			contractIndex: currentIndex,
			totalContracts: contracts.length,
			userFullName,
			daysUntilExpiry: currentContractDays,
		});

		generateSpeech(text)
			.then(() => {
				generatedForRef.current = contractKey;
				playedContractsRef.current.add(currentContract.$id);
			})
			.catch((error) => {
				generatedForRef.current = null;
				console.error("Failed to generate speech:", error);
			});

		return () => {
			stop();
		};
	}, [
		currentIndex,
		currentContract?.$id,
		contracts.length,
		userFullName,
		generateSpeech,
		stop,
		shouldPlaySpeech,
		currentContractDays,
		currentContract,
	]);

	const handleToggleAudio = async () => {
		if (isPlaying) {
			pause();
		} else {
			try {
				await play();
			} catch {
				if (currentContract) {
					const text = formatContractForSpeech({
						contract: currentContract,
						contractIndex: currentIndex,
						totalContracts: contracts.length,
						userFullName,
						daysUntilExpiry: currentContractDays,
					});
					await generateSpeech(text);
				}
			}
		}
	};

	const handlePrevious = () => {
		stop();
		generatedForRef.current = null;
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : contracts.length - 1));
	};

	const handleNext = () => {
		stop();
		generatedForRef.current = null;
		setCurrentIndex((prev) => (prev < contracts.length - 1 ? prev + 1 : 0));
	};

	const handleContractHandled = (contractId: string) => {
		stop();
		if (onContractDismissed) {
			onContractDismissed(contractId);
		} else {
			onDismiss();
		}
	};

	if (!currentContract) return null;

	return (
		<div className="relative w-full h-full">
			{/* Chrome above ExpiryAlertModal (z-9999) so mute / pager stay clickable */}
			<div className="pointer-events-none fixed inset-x-0 top-0 z-[10060] flex items-start justify-between p-6 md:p-8 pr-20">
				<div className="pointer-events-auto">
					<Button
						onClick={handleToggleAudio}
						variant="outline"
						size="icon"
						className="glass-card text-slate-800 shadow-lg cursor-pointer"
						aria-label={isPlaying ? "Pause audio" : "Play audio"}
						disabled={isLoading}
					>
						{isLoading ? (
							<div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
						) : isPlaying ? (
							<VolumeX className="w-5 h-5" />
						) : (
							<Volume2 className="w-5 h-5" />
						)}
					</Button>
				</div>
				{contracts.length > 1 && (
					<div className="pointer-events-none glass-card px-4 py-2 mr-2">
						<span className="text-slate-800 text-sm font-medium">
							{currentIndex + 1} of {contracts.length}
						</span>
					</div>
				)}
			</div>

			{contracts.length > 1 && (
				<>
					<Button
						onClick={handlePrevious}
						variant="outline"
						size="icon"
						className="fixed left-4 top-1/2 z-[10060] -translate-y-1/2 glass-card text-slate-800 shadow-lg cursor-pointer"
						aria-label="Previous alert"
					>
						<ChevronLeft className="w-6 h-6" />
					</Button>
					<Button
						onClick={handleNext}
						variant="outline"
						size="icon"
						className="fixed right-4 top-1/2 z-[10060] -translate-y-1/2 glass-card text-slate-800 shadow-lg cursor-pointer"
						aria-label="Next alert"
					>
						<ChevronRight className="w-6 h-6" />
					</Button>
				</>
			)}

			<AnimatePresence mode="wait">
				<motion.div
					key={currentContract.$id}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<ContractExpiryAlertBridge
						open
						contract={currentContract}
						daysRemaining={currentContractDays}
						onClose={() => {
							stop();
							onDismiss();
						}}
						onContractHandled={handleContractHandled}
						onStatusChange={onStatusChange}
					/>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import { formatContractForSpeech } from "@/lib/contract-speech";
import type { UIFileDoc } from "@/types/files";
import AnimatedContractInfo from "./AnimatedContractInfo";
import ContactDetails from "./ContactDetails";
import ExpiryActionButtons from "./ExpiryActionButtons";
import SplineExpiryScene from "./SplineExpiryScene";

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

	// Reset to first contract if current index is out of bounds (e.g., when a contract is dismissed)
	useEffect(() => {
		if (contracts.length > 0) {
			if (currentIndex >= contracts.length) {
				// If current index is beyond the list, go to the last contract
				setCurrentIndex(Math.max(0, contracts.length - 1));
			}
		} else {
			// If no contracts left, reset index
			setCurrentIndex(0);
		}
	}, [contracts.length, currentIndex]);
	const { generateSpeech, play, pause, stop, isPlaying, isLoading } =
		useElevenLabsTTS({ autoPlay: true });
	const { user } = useAuth();
	const generatedForRef = useRef<string | null>(null); // Track which contract we've generated for
	const playedContractsRef = useRef<Set<string>>(new Set()); // Track contracts that have been played

	const currentContract = contracts[currentIndex];

	// Calculate days until expiry for current contract
	const currentContractDays = useMemo(() => {
		if (!currentContract?.contractExpiryDate) return null;

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
			return null;
		}
	}, [currentContract?.contractExpiryDate]);

	// Get user's full name or name for speech
	const userFullName =
		(user as any)?.fullName || (user as any)?.name || user?.name || "";

	// Stop audio when modal is dismissed (component unmount)
	useEffect(() => {
		return () => {
			stop();
			generatedForRef.current = null;
			playedContractsRef.current.clear();
		};
	}, [stop]);

	// Generate and play speech when modal opens or contract changes
	useEffect(() => {
		if (!currentContract || !shouldPlaySpeech) return;

		const contractKey = `${currentContract.$id}-${currentIndex}`;

		// Prevent duplicate generation for the same contract
		if (generatedForRef.current === contractKey) {
			return;
		}

		// Prevent re-playing speech for contracts already heard
		if (playedContractsRef.current.has(currentContract.$id)) {
			return;
		}

		// Stop any existing audio first (synchronous)
		stop();
		generatedForRef.current = null;

		// Format text immediately (no delay needed for cleanup - stop() is synchronous)
		const text = formatContractForSpeech({
			contract: currentContract,
			contractIndex: currentIndex,
			totalContracts: contracts.length,
			userFullName,
			daysUntilExpiry: currentContractDays,
		});

		// Start generating speech immediately
		generateSpeech(text)
			.then(() => {
				generatedForRef.current = contractKey;
				playedContractsRef.current.add(currentContract.$id);
			})
			.catch((error) => {
				generatedForRef.current = null; // Reset on error so it can retry
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
			// If audio exists, play it; otherwise generate new speech
			try {
				await play();
			} catch {
				// If play fails (no audio yet), generate new speech
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
		stop(); // Stop current contract speech
		generatedForRef.current = null; // Reset so new contract can generate
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : contracts.length - 1));
	};

	const handleNext = () => {
		stop(); // Stop current contract speech before playing next
		generatedForRef.current = null; // Reset so new contract can generate
		setCurrentIndex((prev) => (prev < contracts.length - 1 ? prev + 1 : 0));
	};

	const goToSlide = (index: number) => {
		if (index !== currentIndex) {
			stop(); // Stop audio before changing contract
			generatedForRef.current = null; // Reset so new contract can generate
			setCurrentIndex(index);
		}
	};

	const handleDismiss = () => {
		stop(); // Stop audio when modal is dismissed
		onDismiss();
	};

	return (
		<div className="relative w-full h-full flex flex-col">
			{/* Content Container with frosted glass effect */}
			<div className="relative z-[10001] flex-1 flex flex-col items-center justify-center p-8 md:p-12">
				{/* Frosted glass panel - allows Spline scene to show through blurred */}
				<div className="absolute inset-0 border-0 shadow-2xl" />

				<AnimatePresence mode="wait">
					<motion.div
						key={currentIndex}
						initial={{ opacity: 0, x: 100 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -100 }}
						transition={{ duration: 0.3 }}
						className="relative z-[10002] w-full max-w-5xl mx-auto -mt-6"
					>
						<div className="inline-flex flex-col items-start">
							{/* Contract Information */}
							<AnimatedContractInfo contract={currentContract} />

							{/* Contact Details */}
							<ContactDetails contract={currentContract} />

							{/* Action Buttons */}
							<ExpiryActionButtons
								contract={currentContract}
								onDismiss={() => {
									// When contract is dismissed, notify parent to remove it from the list
									if (onContractDismissed) {
										const dismissedId = currentContract.$id;
										onContractDismissed(dismissedId);
										// The parent will filter out this contract, and useEffect will adjust the index
										// If this was the last contract, the modal will close automatically
									} else {
										// Fallback: close modal if no dismissal handler
										handleDismiss();
									}
								}}
								onStatusChange={onStatusChange}
								daysUntilExpiry={currentContractDays}
							/>
						</div>
					</motion.div>
				</AnimatePresence>

				{/* Navigation Arrows - only show if multiple contracts */}
				{contracts.length > 1 && (
					<>
						<Button
							onClick={handlePrevious}
							variant="outline"
							size="icon"
							className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/40 text-slate-800 border-white/50 backdrop-blur-md shadow-lg z-[10003]"
							aria-label="Previous contract"
						>
							<ChevronLeft className="w-6 h-6" />
						</Button>
						<Button
							onClick={handleNext}
							variant="outline"
							size="icon"
							className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/40 text-slate-800 border-white/50 backdrop-blur-md shadow-lg z-[10003]"
							aria-label="Next contract"
						>
							<ChevronRight className="w-6 h-6" />
						</Button>
					</>
				)}

				{/* Dot Indicators - only show if multiple contracts */}
				{contracts.length > 1 && (
					<div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[10003]">
						{contracts.map((_, index) => (
							<button
								key={index}
								onClick={() => goToSlide(index)}
								className={`w-3 h-3 rounded-full transition-all backdrop-blur-sm ${
									index === currentIndex
										? "bg-slate-700 w-8 border border-white/30"
										: "bg-white/50 hover:bg-white/75 border border-white/20"
								}`}
								aria-label={`Go to contract ${index + 1}`}
							/>
						))}
					</div>
				)}

				{/* Audio Control Button - top left */}
				<Button
					onClick={handleToggleAudio}
					variant="outline"
					size="icon"
					className="absolute top-8 left-8 glass-card text-slate-800 shadow-lg z-[10003]"
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

				{/* Close Button and Contract Counter - grouped on the right */}
				<div className="absolute top-8 right-8 flex items-center gap-3 z-[10003]">
					{contracts.length > 1 && (
						<div className="glass-card px-4 py-2">
							<span className="text-slate-800 text-sm font-medium">
								{currentIndex + 1} of {contracts.length}
							</span>
						</div>
					)}
					<Button
						onClick={handleDismiss}
						variant="outline"
						size="icon"
						className="glass-card text-slate-800 shadow-lg"
						aria-label="Close modal"
					>
						<X className="w-5 h-5" />
					</Button>
				</div>
			</div>

			{/* Spline Scene - in front of all elements, no blur */}
			<SplineExpiryScene className="z-[10000]" />
		</div>
	);
}

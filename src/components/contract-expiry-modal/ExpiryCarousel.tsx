"use client";

import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ExpiryQueueAlertBridge from "@/components/expiry-alert-modal/ExpiryQueueAlertBridge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import {
	expiryItemKey,
	type ExpiryQueueItem,
} from "@/lib/expiry/expiry-queue";
import {
	type ExpirySpeechMode,
	formatExpiryQueueSpeech,
} from "@/lib/expiry/expiry-speech";
import { suppressContractAlarm } from "@/lib/sounds/contractAlarm";

interface ExpiryCarouselProps {
	items: ExpiryQueueItem[];
	onDismiss: () => void;
	onItemDismissed?: (item: ExpiryQueueItem) => void;
	onStatusChange?: () => void;
	shouldPlaySpeech?: boolean;
}

export default function ExpiryCarousel({
	items,
	onDismiss,
	onItemDismissed,
	onStatusChange,
	shouldPlaySpeech = true,
}: ExpiryCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [speechMuted, setSpeechMuted] = useState(false);
	const { user } = useAuth();
	const generatedForRef = useRef<string | null>(null);
	const speechRequestRef = useRef(0);
	const openIntroPlayedRef = useRef(false);
	const prevItemsSignatureRef = useRef<string | null>(null);
	const currentIndexRef = useRef(0);
	const itemsLengthRef = useRef(items.length);
	const skipAutoAdvanceRef = useRef(false);

	currentIndexRef.current = currentIndex;
	itemsLengthRef.current = items.length;

	const handlePlaybackEnd = useCallback(() => {
		if (skipAutoAdvanceRef.current) {
			skipAutoAdvanceRef.current = false;
			return;
		}
		const index = currentIndexRef.current;
		const length = itemsLengthRef.current;
		if (length <= 1 || index >= length - 1) return;

		generatedForRef.current = null;
		setCurrentIndex(index + 1);
	}, []);

	const { generateSpeech, stop, isLoading } = useElevenLabsTTS({
		autoPlay: true,
		onPlaybackEnd: handlePlaybackEnd,
	});

	useEffect(() => {
		if (items.length > 0) {
			if (currentIndex >= items.length) {
				setCurrentIndex(Math.max(0, items.length - 1));
			}
		} else {
			setCurrentIndex(0);
		}
	}, [items.length, currentIndex]);

	const currentItem = items[currentIndex];

	const userFullName =
		(user as { fullName?: string; name?: string } | null)?.fullName ||
		(user as { name?: string } | null)?.name ||
		user?.name ||
		"";

	useEffect(() => {
		// Let Expire is a user click, which unlocks autoplay. Suppress the
		// looping dashboard bell for the whole overlay session so it cannot
		// start behind the modal (Silence lives on the widget, not here).
		suppressContractAlarm();
		return () => {
			stop();
			generatedForRef.current = null;
			suppressContractAlarm();
		};
	}, [stop]);

	const itemsSignature = items.map((i) => `${i.kind}:${i.id}`).join("|");

	useEffect(() => {
		if (
			prevItemsSignatureRef.current !== null &&
			prevItemsSignatureRef.current !== itemsSignature
		) {
			stop();
		}
		prevItemsSignatureRef.current = itemsSignature;
	}, [itemsSignature, stop]);

	useEffect(() => {
		if (!currentItem || !shouldPlaySpeech || speechMuted) return;

		const spokenKey = expiryItemKey(currentItem, currentIndex);
		if (generatedForRef.current === spokenKey) return;

		const requestId = ++speechRequestRef.current;
		stop();

		const mode: ExpirySpeechMode =
			!openIntroPlayedRef.current && currentIndex === 0 ? "open" : "navigate";

		const text = formatExpiryQueueSpeech({
			items,
			index: currentIndex,
			mode,
			userFullName,
		});

		generateSpeech(text)
			.then(() => {
				if (speechRequestRef.current !== requestId) return;
				generatedForRef.current = spokenKey;
				if (mode === "open") {
					openIntroPlayedRef.current = true;
				}
			})
			.catch((error) => {
				if (speechRequestRef.current === requestId) {
					generatedForRef.current = null;
				}
				console.error("Failed to generate speech:", error);
			});

		return () => {
			speechRequestRef.current += 1;
			stop();
		};
		// itemsSignature tracks queue identity without depending on array reference
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
	}, [
		currentIndex,
		currentItem?.kind,
		currentItem?.id,
		itemsSignature,
		userFullName,
		generateSpeech,
		stop,
		shouldPlaySpeech,
		speechMuted,
	]);

	const handleToggleAudio = () => {
		if (!speechMuted) {
			setSpeechMuted(true);
			generatedForRef.current = null;
			stop();
			suppressContractAlarm();
			return;
		}

		generatedForRef.current = null;
		setSpeechMuted(false);
	};

	const handlePrevious = () => {
		skipAutoAdvanceRef.current = true;
		stop();
		generatedForRef.current = null;
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
	};

	const handleNext = () => {
		skipAutoAdvanceRef.current = true;
		stop();
		generatedForRef.current = null;
		setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
	};

	const handleItemHandled = (item: ExpiryQueueItem) => {
		skipAutoAdvanceRef.current = true;
		stop();
		suppressContractAlarm();
		if (onItemDismissed) {
			onItemDismissed(item);
		} else {
			onDismiss();
		}
	};

	if (!currentItem) return null;

	return (
		<div className="absolute inset-0">
			{/* Top-left chrome: mute + counter (keep top-right free for modal X) */}
			<div className="pointer-events-none absolute left-0 top-0 z-[10060] flex items-center gap-3 p-6 md:p-8">
				<div className="pointer-events-auto">
					<Button
						onClick={handleToggleAudio}
						variant="outline"
						size="icon"
						className="glass-card text-slate-800 shadow-lg cursor-pointer"
						aria-label={speechMuted ? "Unmute audio" : "Mute audio"}
					>
						{speechMuted ? (
							<VolumeX className="w-5 h-5" />
						) : isLoading ? (
							<div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
						) : (
							<Volume2 className="w-5 h-5" />
						)}
					</Button>
				</div>
				{items.length > 1 && (
					<div className="pointer-events-none glass-card px-4 py-2">
						<span className="text-slate-800 text-sm font-medium">
							{currentIndex + 1} of {items.length}
						</span>
					</div>
				)}
			</div>

			{items.length > 1 && (
				<div className="pointer-events-none absolute inset-0 z-[10070] flex items-center justify-between px-4 md:px-6">
					<Button
						type="button"
						onClick={handlePrevious}
						variant="outline"
						size="icon"
						className="pointer-events-auto relative z-[10070] h-11 w-11 shrink-0 glass-card text-slate-800 shadow-lg cursor-pointer"
						aria-label="Previous alert"
					>
						<ChevronLeft className="!h-6 !w-6" />
					</Button>
					<Button
						type="button"
						onClick={handleNext}
						variant="outline"
						size="icon"
						className="pointer-events-auto relative z-[10070] h-11 w-11 shrink-0 glass-card text-slate-800 shadow-lg cursor-pointer"
						aria-label="Next alert"
					>
						<ChevronRight className="!h-6 !w-6" />
					</Button>
				</div>
			)}

			{/* Stable shell — content panel fades inside ExpiryAlertModal */}
			<ExpiryQueueAlertBridge
				item={currentItem}
				onClose={() => {
					skipAutoAdvanceRef.current = true;
					stop();
					suppressContractAlarm();
					onDismiss();
				}}
				onItemHandled={handleItemHandled}
				onStatusChange={onStatusChange}
			/>
		</div>
	);
}

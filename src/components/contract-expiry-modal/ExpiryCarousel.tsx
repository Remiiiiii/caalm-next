"use client";

import { format, parseISO } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import ExpiryQueueAlertBridge from "@/components/expiry-alert-modal/ExpiryQueueAlertBridge";
import type {
	ExpiryNarration,
	ExpiryQueue,
	ExpiryQueueRow,
} from "@/components/expiry-alert-modal/expiry-alert-types";
import { useAuth } from "@/contexts/AuthContext";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import { toExpiryItemView } from "@/lib/expiry/expiry-item-view";
import { type ExpiryQueueItem, expiryItemKey } from "@/lib/expiry/expiry-queue";
import {
	type ExpirySpeechMode,
	formatExpiryQueueSpeech,
} from "@/lib/expiry/expiry-speech";
import { summarizeExpiryQueue } from "@/lib/expiry/queue-summary";
import { suppressContractAlarm } from "@/lib/sounds/contractAlarm";
import { DESKTOP_MIN_WIDTH } from "@/lib/ui/desktop-first";

/** Seconds shown counting down before auto-advance fires. */
const COUNTDOWN_SECONDS = 6;

interface ExpiryCarouselProps {
	items: ExpiryQueueItem[];
	onDismiss: () => void;
	onItemDismissed?: (item: ExpiryQueueItem) => void;
	/** Park the queue without marking items handled (Open in workspace). */
	onParkSession?: (index: number) => void;
	onStatusChange?: () => void;
	shouldPlaySpeech?: boolean;
	/** Resume index after parking the session. */
	initialIndex?: number;
}

function formatShortDate(raw: string): string {
	if (!raw) return "—";
	try {
		const date = raw.includes("T")
			? parseISO(raw)
			: parseISO(`${raw}T12:00:00`);
		return format(date, "MMM d, yyyy");
	} catch {
		return raw.slice(0, 10);
	}
}

export default function ExpiryCarousel({
	items,
	onDismiss,
	onItemDismissed,
	onParkSession,
	onStatusChange,
	shouldPlaySpeech = true,
	initialIndex = 0,
}: ExpiryCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(() =>
		Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)),
	);
	const [speechMuted, setSpeechMuted] = useState(false);
	const [countdown, setCountdown] = useState<number | null>(null);
	const [paused, setPaused] = useState(false);
	const [isPhone, setIsPhone] = useState(false);
	const { user } = useAuth();

	const generatedForRef = useRef<string | null>(null);
	const speechRequestRef = useRef(0);
	const openIntroPlayedRef = useRef(false);
	const prevItemsSignatureRef = useRef<string | null>(null);
	const currentIndexRef = useRef(0);
	const itemsLengthRef = useRef(items.length);
	const skipAutoAdvanceRef = useRef(false);
	// Manual navigation cancels auto-advance for the rest of the session.
	const sessionAutoAdvanceDisabledRef = useRef(false);
	const speechMutedRef = useRef(false);
	// Stay here / Pause cancels auto-advance for this item only (survives speech end).
	const pausedRef = useRef(false);
	const countdownTimerRef = useRef<number | null>(null);

	currentIndexRef.current = currentIndex;
	itemsLengthRef.current = items.length;
	speechMutedRef.current = speechMuted;

	useEffect(() => {
		const check = () => setIsPhone(window.innerWidth < DESKTOP_MIN_WIDTH);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);

	const clearCountdown = useCallback(() => {
		if (countdownTimerRef.current !== null) {
			window.clearInterval(countdownTimerRef.current);
			countdownTimerRef.current = null;
		}
		setCountdown(null);
	}, []);

	const startCountdown = useCallback(() => {
		clearCountdown();
		pausedRef.current = false;
		setPaused(false);
		setCountdown(COUNTDOWN_SECONDS);
		let remaining = COUNTDOWN_SECONDS;
		countdownTimerRef.current = window.setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) {
				clearCountdown();
				// Advance to the next item.
				generatedForRef.current = null;
				setCurrentIndex((prev) =>
					Math.min(prev + 1, itemsLengthRef.current - 1),
				);
			} else {
				setCountdown(remaining);
			}
		}, 1000);
	}, [clearCountdown]);

	const handlePlaybackEnd = useCallback(() => {
		if (skipAutoAdvanceRef.current) {
			skipAutoAdvanceRef.current = false;
			return;
		}
		const index = currentIndexRef.current;
		const length = itemsLengthRef.current;
		if (length <= 1 || index >= length - 1) return;
		if (sessionAutoAdvanceDisabledRef.current) return;
		if (speechMutedRef.current) return;
		if (pausedRef.current) return;
		// Auto-advance only ever fires after a visible countdown.
		startCountdown();
	}, [startCountdown]);

	const { generateSpeech, stop, isLoading, isPlaying } = useElevenLabsTTS({
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
			clearCountdown();
			generatedForRef.current = null;
			suppressContractAlarm();
		};
	}, [stop, clearCountdown]);

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
			clearCountdown();
			pausedRef.current = false;
			setPaused(false);
			generatedForRef.current = null;
			stop();
			suppressContractAlarm();
			return;
		}
		generatedForRef.current = null;
		setSpeechMuted(false);
	};

	// Stay here / Pause — cancel auto-advance for this item only.
	const handlePause = () => {
		clearCountdown();
		pausedRef.current = true;
		setPaused(true);
	};

	const goToIndex = (nextIndex: number) => {
		skipAutoAdvanceRef.current = true;
		sessionAutoAdvanceDisabledRef.current = true;
		clearCountdown();
		pausedRef.current = false;
		setPaused(false);
		stop();
		generatedForRef.current = null;
		setCurrentIndex(nextIndex);
	};

	const handlePrevious = () => {
		goToIndex(currentIndex > 0 ? currentIndex - 1 : items.length - 1);
	};

	const handleNext = () => {
		goToIndex(currentIndex < items.length - 1 ? currentIndex + 1 : 0);
	};

	const handleJump = (index: number) => {
		if (index === currentIndex) return;
		goToIndex(index);
	};

	const handleItemHandled = (item: ExpiryQueueItem) => {
		skipAutoAdvanceRef.current = true;
		clearCountdown();
		pausedRef.current = false;
		setPaused(false);
		stop();
		suppressContractAlarm();
		if (onItemDismissed) {
			onItemDismissed(item);
		} else {
			onDismiss();
		}
	};

	if (!currentItem) return null;

	const nextIndex =
		items.length > 1 && currentIndex < items.length - 1
			? currentIndex + 1
			: null;
	const nextLabel =
		nextIndex !== null ? toExpiryItemView(items[nextIndex]).title : null;

	const narration: ExpiryNarration | null = shouldPlaySpeech
		? {
				muted: speechMuted,
				isPlaying: isPlaying && !isLoading,
				onToggleMute: handleToggleAudio,
				onStayHere: handlePause,
				countdownSeconds: countdown,
				nextLabel,
				paused,
			}
		: null;

	const summary = summarizeExpiryQueue(items);
	const rows: ExpiryQueueRow[] = items.map((item) => {
		const view = toExpiryItemView(item);
		return {
			id: `${item.kind}:${item.id}`,
			kind: item.kind,
			title: view.title,
			days: item.days,
			dateLabel: formatShortDate(view.expiresAt),
			amount: view.amount,
			done: false,
		};
	});

	const queue: ExpiryQueue = {
		rows,
		currentIndex,
		nextIndex,
		overdue: summary.overdue,
		within30: summary.within30,
		amountSum: summary.amountSum,
		countdownSeconds: countdown,
		countdownTotal: COUNTDOWN_SECONDS,
		paused,
		onJump: handleJump,
		onPause: handlePause,
		onDismissAll: onDismiss,
		defaultExpanded: !isPhone,
	};

	const handleClose = () => {
		skipAutoAdvanceRef.current = true;
		clearCountdown();
		pausedRef.current = false;
		stop();
		suppressContractAlarm();
		onDismiss();
	};

	const handleParkSession = () => {
		skipAutoAdvanceRef.current = true;
		clearCountdown();
		pausedRef.current = false;
		setPaused(false);
		stop();
		suppressContractAlarm();
		onParkSession?.(currentIndex);
	};

	return (
		<ExpiryQueueAlertBridge
			item={currentItem}
			onClose={handleClose}
			onItemHandled={handleItemHandled}
			onParkSession={onParkSession ? handleParkSession : undefined}
			onStatusChange={onStatusChange}
			queuePosition={{ index: currentIndex, total: items.length }}
			onPrev={items.length > 1 ? handlePrevious : undefined}
			onNext={items.length > 1 ? handleNext : undefined}
			narration={narration}
			queue={queue}
		/>
	);
}

/**
 * useContractAlarm Hook
 * Manages contract expiry alarm playback and silence state
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getExpiredContracts,
	getExpiringContracts,
	shouldPlayAlarm,
} from "@/lib/utils/contract-alarm";

const ALARM_SILENCED_KEY = "contract_alarm_silenced_until";
const ALARM_SILENCE_DURATION = 60 * 60 * 1000; // 1 hour
const ALARM_DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface Contract {
	$id: string;
	contractName: string;
	contractExpiryDate?: string;
	daysUntilExpiry?: number;
}

interface UseContractAlarmOptions {
	contracts: Contract[];
	enabled?: boolean;
}

export function useContractAlarm({
	contracts,
	enabled = true,
}: UseContractAlarmOptions) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isSilenced, setIsSilenced] = useState(false);
	const hasPlayedRef = useRef(false);
	const playAttemptedRef = useRef(false);

	// Memoize contracts array to prevent dependency array changes
	const contractsArray = useMemo(() => {
		return Array.isArray(contracts) ? contracts : [];
	}, [contracts]);

	// Initialize audio element
	useEffect(() => {
		if (typeof window === "undefined") return;

		const audio = new Audio(
			"/assets/sounds/alarm-clock-digital-bell-ringing-brukowskij-1-1-00-04.mp3",
		);
		audio.loop = true;
		audio.volume = 0.7; // 70% volume to avoid being jarring

		// Handle audio events
		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);
		const handleEnded = () => setIsPlaying(false);
		const handleError = (e: Event) => {
			console.error("Contract alarm audio error:", e);
			setIsPlaying(false);
		};

		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		audioRef.current = audio;

		return () => {
			audio.pause();
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};
	}, []);

	// Check silenced state from localStorage
	useEffect(() => {
		if (typeof window === "undefined") return;

		const silencedUntil = localStorage.getItem(ALARM_SILENCED_KEY);
		if (silencedUntil) {
			const timestamp = parseInt(silencedUntil, 10);
			if (Date.now() < timestamp) {
				setIsSilenced(true);
			} else {
				// Silence period expired, clear it
				localStorage.removeItem(ALARM_SILENCED_KEY);
				setIsSilenced(false);
			}
		}
	}, []);

	// Check if alarm should play
	useEffect(() => {
		if (!enabled || !audioRef.current || isSilenced || hasPlayedRef.current) {
			return;
		}

		const silencedUntil = localStorage.getItem(ALARM_SILENCED_KEY)
			? parseInt(localStorage.getItem(ALARM_SILENCED_KEY)!, 10)
			: null;

		const shouldPlay = shouldPlayAlarm(contractsArray, silencedUntil);

		if (shouldPlay && !playAttemptedRef.current) {
			playAttemptedRef.current = true;

			// Attempt to play with user interaction fallback
			const playPromise = audioRef.current.play();

			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						hasPlayedRef.current = true;
					})
					.catch((error) => {
						// Browser autoplay policy blocked - show visual indicator instead
						console.warn("Alarm autoplay blocked:", error);
						// Reset attempt flag so it can try again on user interaction
						playAttemptedRef.current = false;
					});
			}
		} else if (!shouldPlay && isPlaying) {
			// Contracts no longer expiring, stop alarm
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			hasPlayedRef.current = false;
			playAttemptedRef.current = false;
		}
	}, [contractsArray, enabled, isSilenced, isPlaying]);

	// Reset play state when contracts change significantly
	// Stop alarm if all contracts have expired or no contracts are expiring
	useEffect(() => {
		const expiringContracts = getExpiringContracts(contractsArray);
		if (expiringContracts.length === 0) {
			// No contracts expiring - stop alarm if playing
			if (audioRef.current && isPlaying) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
				setIsPlaying(false);
			}
			hasPlayedRef.current = false;
			playAttemptedRef.current = false;
		}
	}, [contractsArray, isPlaying]);

	// Silence alarm function
	const silenceAlarm = useCallback(
		(duration: number = ALARM_SILENCE_DURATION) => {
			if (!audioRef.current) return;

			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			setIsPlaying(false);
			setIsSilenced(true);
			hasPlayedRef.current = false;
			playAttemptedRef.current = false;

			// Store silence timestamp
			const silencedUntil = Date.now() + duration;
			localStorage.setItem(ALARM_SILENCED_KEY, silencedUntil.toString());
		},
		[],
	);

	// Dismiss alarm permanently for this session (24 hours)
	const dismissAlarm = useCallback(() => {
		silenceAlarm(ALARM_DISMISS_DURATION);
	}, [silenceAlarm]);

	// Get expiring and expired contracts counts
	const expiringContractsCount = getExpiringContracts(contractsArray).length;
	const expiredContractsCount = getExpiredContracts(contractsArray).length;

	return {
		isPlaying,
		isSilenced,
		silenceAlarm,
		dismissAlarm,
		expiringContractsCount,
		expiredContractsCount,
	};
}

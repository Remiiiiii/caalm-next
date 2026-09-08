/**
 * useContractAlarm Hook
 * Manages contract expiry alarm playback and silence state
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getContractAlarmSilencedUntil,
	getContractAlarmSnapshot,
	isContractAlarmBlocked,
	isForcedContractAlarm,
	playContractAlarm,
	silenceContractAlarm,
	stopContractAlarm,
	subscribeContractAlarm,
} from "@/lib/sounds/contractAlarm";
import {
	getExpiredContracts,
	getExpiringContracts,
	shouldPlayAlarm,
} from "@/lib/utils/contract-alarm";

const ALARM_SILENCE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
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
	const [isPlaying, setIsPlaying] = useState(false);
	const [isSilenced, setIsSilenced] = useState(false);
	const hasPlayedRef = useRef(false);
	const playAttemptedRef = useRef(false);

	const contractsArray = useMemo(() => {
		return Array.isArray(contracts) ? contracts : [];
	}, [contracts]);

	const syncFromSingleton = useCallback(() => {
		const snapshot = getContractAlarmSnapshot();
		setIsPlaying(snapshot.playing);
		setIsSilenced(snapshot.silenced || snapshot.suppressed);
	}, []);

	useEffect(() => {
		syncFromSingleton();
		return subscribeContractAlarm(syncFromSingleton);
	}, [syncFromSingleton]);

	useEffect(() => {
		if (!enabled) {
			stopContractAlarm();
			return;
		}

		if (isContractAlarmBlocked() || hasPlayedRef.current) {
			return;
		}

		const shouldPlay = shouldPlayAlarm(
			contractsArray,
			getContractAlarmSilencedUntil(),
		);

		if (shouldPlay && !playAttemptedRef.current) {
			playAttemptedRef.current = true;

			void playContractAlarm()
				.then(() => {
					hasPlayedRef.current = true;
				})
				.catch(() => {
					// Browser autoplay blocked — retry after a later user gesture
					playAttemptedRef.current = false;
				});
		} else if (!shouldPlay && !isForcedContractAlarm()) {
			stopContractAlarm();
			hasPlayedRef.current = false;
			playAttemptedRef.current = false;
		}
	}, [contractsArray, enabled]);

	useEffect(() => {
		const expiringContracts = getExpiringContracts(contractsArray);
		if (expiringContracts.length === 0 && !isForcedContractAlarm()) {
			stopContractAlarm();
			hasPlayedRef.current = false;
			playAttemptedRef.current = false;
		}
	}, [contractsArray]);

	const silenceAlarm = useCallback(
		(duration: number = ALARM_SILENCE_DURATION) => {
			silenceContractAlarm(duration);
			hasPlayedRef.current = false;
			playAttemptedRef.current = false;
		},
		[],
	);

	const dismissAlarm = useCallback(() => {
		silenceAlarm(ALARM_DISMISS_DURATION);
	}, [silenceAlarm]);

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

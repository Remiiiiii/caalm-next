/**
 * Shared looping expiry alarm (dashboard widget + full-screen alert).
 *
 * One Audio element so the modal can stop the widget's bell. Without this,
 * Let Expire is a user click that unlocks autoplay, the widget starts a
 * looping mp3, and Silence lives on the widget behind the overlay.
 */

const ALARM_SRC =
	"/assets/sounds/alarm-clock-digital-bell-ringing-brukowskij-1-1-00-04.mp3";

export const CONTRACT_ALARM_SILENCED_KEY = "contract_alarm_silenced_until";

let audioInstance: HTMLAudioElement | null = null;
let suppressed = false;
let forcedPlayback = false;
const listeners = new Set<() => void>();

export type ContractAlarmSnapshot = {
	playing: boolean;
	suppressed: boolean;
	silenced: boolean;
};

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function getSilencedUntil(): number | null {
	if (typeof window === "undefined") return null;
	const raw = localStorage.getItem(CONTRACT_ALARM_SILENCED_KEY);
	if (!raw) return null;
	const timestamp = Number.parseInt(raw, 10);
	if (!Number.isFinite(timestamp)) return null;
	if (Date.now() >= timestamp) {
		localStorage.removeItem(CONTRACT_ALARM_SILENCED_KEY);
		return null;
	}
	return timestamp;
}

function getAudio(): HTMLAudioElement | null {
	if (typeof window === "undefined") return null;
	if (!audioInstance) {
		audioInstance = new Audio(ALARM_SRC);
		audioInstance.loop = true;
		audioInstance.volume = 0.7;
		audioInstance.addEventListener("play", notify);
		audioInstance.addEventListener("pause", notify);
		audioInstance.addEventListener("ended", notify);
	}
	return audioInstance;
}

export function getContractAlarmSnapshot(): ContractAlarmSnapshot {
	const audio = audioInstance;
	return {
		playing: Boolean(audio && !audio.paused),
		suppressed,
		silenced: getSilencedUntil() !== null,
	};
}

export function subscribeContractAlarm(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function isContractAlarmBlocked(): boolean {
	return suppressed || getSilencedUntil() !== null;
}

export function getContractAlarmSilencedUntil(): number | null {
	return getSilencedUntil();
}

export function stopContractAlarm(): void {
	forcedPlayback = false;
	if (!audioInstance) return;
	audioInstance.pause();
	audioInstance.currentTime = 0;
	notify();
}

/**
 * Stop the bell and block autoplay for the rest of this page session.
 * Used while the full-screen expiry overlay is open.
 */
export function suppressContractAlarm(): void {
	suppressed = true;
	stopContractAlarm();
}

export function playContractAlarm(): Promise<void> {
	if (isContractAlarmBlocked()) {
		return Promise.resolve();
	}

	const audio = getAudio();
	if (!audio) return Promise.resolve();

	const playPromise = audio.play();
	if (playPromise === undefined) {
		notify();
		return Promise.resolve();
	}

	return playPromise.then(() => {
		notify();
	});
}

/** Clears silence/suppress and plays, even if nothing expires within 24 hours. */
export function forcePlayContractAlarm(): Promise<void> {
	suppressed = false;
	forcedPlayback = true;
	if (typeof window !== "undefined") {
		localStorage.removeItem(CONTRACT_ALARM_SILENCED_KEY);
	}
	return playContractAlarm();
}

export function isForcedContractAlarm(): boolean {
	return forcedPlayback;
}

export function silenceContractAlarm(durationMs: number): void {
	if (typeof window !== "undefined") {
		localStorage.setItem(
			CONTRACT_ALARM_SILENCED_KEY,
			String(Date.now() + durationMs),
		);
	}
	suppressed = true;
	stopContractAlarm();
}

/** Test-only: reset module state between cases. */
export function resetContractAlarmForTests(): void {
	suppressed = false;
	forcedPlayback = false;
	if (typeof window !== "undefined") {
		localStorage.removeItem(CONTRACT_ALARM_SILENCED_KEY);
	}
	stopContractAlarm();
	audioInstance = null;
}

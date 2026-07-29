const NOTIFICATION_SOUND_SRC = "/assets/sounds/notification.mp3";

let audioInstance: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement | null {
	if (typeof window === "undefined") return null;
	if (!audioInstance) {
		audioInstance = new Audio(NOTIFICATION_SOUND_SRC);
		audioInstance.volume = 0.65;
	}
	return audioInstance;
}

export function playNotificationSound() {
	const audio = getAudio();
	if (!audio) return;

	audio.currentTime = 0;
	void audio.play().catch(() => {
		// Browser autoplay policy may block until user interaction
	});
}

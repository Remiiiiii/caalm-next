export const MAX_RECORDING_MS = 60_000;
export const MAX_RECORDING_BYTES = 10 * 1024 * 1024;

export interface TicketRecording {
	blob: Blob;
	url: string;
	mime: string;
	bytes: number;
	durationMs: number;
	hasAudio: boolean;
}

export function pickMime(): string | null {
	if (typeof MediaRecorder === "undefined") return null;
	const candidates = [
		"video/webm;codecs=vp9,opus",
		"video/webm;codecs=vp8,opus",
		"video/webm",
		"video/mp4;codecs=avc1,mp4a.40.2",
		"video/mp4",
	];
	return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function isScreenRecordingSupported(): boolean {
	return (
		typeof navigator !== "undefined" &&
		!!navigator.mediaDevices?.getDisplayMedia &&
		pickMime() !== null
	);
}

export function ticketRecordingToFile(r: TicketRecording): File {
	const mime = r.mime || "video/webm";
	const ext = mime.includes("mp4")
		? "mp4"
		: mime.includes("quicktime")
			? "mov"
			: "webm";
	return new File([r.blob], `screen-recording.${ext}`, { type: mime });
}

export function formatRecordingDuration(ms: number): string {
	const s = Math.min(60, Math.floor(ms / 1000));
	return `0:${String(s).padStart(2, "0")}`;
}

/** Chromium extras; prefer current tab when already on the problem page. */
export function displayMediaConstraints(
	preferCurrentTab = false,
): DisplayMediaStreamOptions {
	return {
		video: { frameRate: 15 },
		audio: false,
		preferCurrentTab,
		selfBrowserSurface: preferCurrentTab ? "include" : "exclude",
	} as DisplayMediaStreamOptions;
}

/**
 * MediaRecorder WebM often reports duration 0/Infinity. Seek past the end so
 * the browser writes a real duration, then rewind for playback.
 */
export function repairPreviewDuration(video: HTMLVideoElement): void {
	const apply = () => {
		if (Number.isFinite(video.duration) && video.duration > 0) return;
		video.currentTime = 1e101;
		const rewind = () => {
			video.removeEventListener("timeupdate", rewind);
			video.currentTime = 0;
		};
		video.addEventListener("timeupdate", rewind);
	};
	if (video.readyState >= 1) apply();
	else video.addEventListener("loadedmetadata", apply, { once: true });
}

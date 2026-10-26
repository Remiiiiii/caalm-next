"use client";

import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { parseProblemPageUrl } from "@/lib/tickets/problem-page-url";
import {
	consumePendingScreenRecord,
	savePendingScreenRecord,
} from "@/lib/tickets/ticket-form-draft";
import {
	displayMediaConstraints,
	MAX_RECORDING_BYTES,
	MAX_RECORDING_MS,
	pickMime,
	type TicketRecording,
} from "@/lib/tickets/ticket-recording";

const TICKET_FORM_PATH = "/tickets/new";
// ~850 kbps keeps a full 60 s clip (about 6.5 MB) well under the 10 MB limit.
const VIDEO_BPS = 850_000;
// Stop early if the clip nears the upload limit before the time cap.
const STOP_AT_BYTES = MAX_RECORDING_BYTES * 0.92;
const AUDIO_BPS = 32_000;

type RecorderPhase = "idle" | "recording" | "error";

function recorderErrorMessage(e: unknown): { text: string; idle: boolean } {
	if (e instanceof DOMException && e.name === "NotAllowedError") {
		return {
			text: "Screen sharing was cancelled. Click Record to try again.",
			idle: true,
		};
	}
	if (e instanceof DOMException && e.name === "AbortError") {
		return {
			text: "Screen sharing was cancelled. Click Record to try again.",
			idle: true,
		};
	}
	if (e instanceof DOMException && e.name === "InvalidStateError") {
		return {
			text: "The last share is still closing. Click Record again.",
			idle: true,
		};
	}
	return { text: "Couldn't start the recording.", idle: false };
}

type TicketRecordingContextValue = {
	draftRecording: TicketRecording | null;
	setDraftRecording: (r: TicketRecording | null) => void;
	phase: RecorderPhase;
	elapsedMs: number;
	error: string | null;
	/** True while recording with a live microphone track. */
	micOn: boolean;
	isRecording: boolean;
	clearError: () => void;
	startRecording: (input: {
		problemPageUrl: string;
		withMic: boolean;
		onBeforeNavigate?: () => void;
	}) => Promise<void>;
	stopRecording: () => void;
};

const TicketRecordingContext =
	createContext<TicketRecordingContextValue | null>(null);

export function useTicketRecording(): TicketRecordingContextValue {
	const ctx = useContext(TicketRecordingContext);
	if (!ctx) {
		throw new Error(
			"useTicketRecording must be used within TicketRecordingProvider",
		);
	}
	return ctx;
}

export function TicketRecordingProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname() || "/";
	const [draftRecording, setDraftRecording] = useState<TicketRecording | null>(
		null,
	);
	const [phase, setPhase] = useState<RecorderPhase>("idle");
	const [elapsedMs, setElapsedMs] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [micOn, setMicOn] = useState(false);

	const streamsRef = useRef<MediaStream[]>([]);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<number | null>(null);
	const startedAtRef = useRef(0);
	const hasAudioRef = useRef(false);
	const cancelledRef = useRef(false);
	const startedRef = useRef(false);
	const pathnameRef = useRef(pathname);
	pathnameRef.current = pathname;
	const beginCaptureRef = useRef<
		((withMic: boolean, preferCurrentTab: boolean) => Promise<void>) | null
	>(null);

	const cleanupStreams = useCallback(() => {
		streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
		streamsRef.current = [];
		if (timerRef.current) window.clearInterval(timerRef.current);
		timerRef.current = null;
		recorderRef.current = null;
		startedRef.current = false;
	}, []);

	// After a clip stops (Stop button, 60 s cap, or the browser's Stop sharing),
	// bring the user back to the ticket form where the clip is waiting.
	const returnToTicketForm = useCallback(() => {
		if (pathnameRef.current !== TICKET_FORM_PATH) router.push(TICKET_FORM_PATH);
	}, [router]);

	const stopRecording = useCallback(() => {
		const rec = recorderRef.current;
		if (rec && rec.state !== "inactive") rec.stop();
	}, []);

	const cancelRecording = useCallback(() => {
		cancelledRef.current = true;
		stopRecording();
		cleanupStreams();
		setPhase("idle");
		setElapsedMs(0);
	}, [cleanupStreams, stopRecording]);

	const beginCapture = useCallback(
		async (withMic: boolean, preferCurrentTab: boolean) => {
			setError(null);
			cancelledRef.current = false;
			startedRef.current = false;
			cleanupStreams();

			const mime = pickMime();
			if (!mime || !navigator.mediaDevices?.getDisplayMedia) {
				setError("Screen recording isn't supported in this browser.");
				setPhase("error");
				return;
			}

			try {
				const display = await navigator.mediaDevices.getDisplayMedia(
					displayMediaConstraints(preferCurrentTab),
				);
				if (cancelledRef.current) {
					display.getTracks().forEach((t) => t.stop());
					return;
				}
				streamsRef.current.push(display);

				const tracks = [...display.getVideoTracks()];
				const liveVideo = tracks[0];
				if (!liveVideo || liveVideo.readyState !== "live") {
					display.getTracks().forEach((t) => t.stop());
					setError("Nothing was shared. Click Record to try again.");
					returnToTicketForm();
					setPhase("idle");
					return;
				}

				hasAudioRef.current = false;
				if (withMic) {
					try {
						const mic = await navigator.mediaDevices.getUserMedia({
							audio: true,
						});
						streamsRef.current.push(mic);
						tracks.push(...mic.getAudioTracks());
						hasAudioRef.current = true;
					} catch {
						/* mic denied */
					}
				}
				const combined = new MediaStream(tracks);

				liveVideo.addEventListener("ended", () => {
					if (startedRef.current) stopRecording();
					else cancelRecording();
				});

				const rec = new MediaRecorder(combined, {
					mimeType: mime,
					videoBitsPerSecond: VIDEO_BPS,
					audioBitsPerSecond: AUDIO_BPS,
				});
				chunksRef.current = [];
				rec.ondataavailable = (e) => {
					if (!e.data.size) return;
				chunksRef.current.push(e.data);
				const total = chunksRef.current.reduce((sum, c) => sum + c.size, 0);
				if (total >= STOP_AT_BYTES) stopRecording();
				};
				rec.onstop = () => {
					const durationMs = Math.min(
						MAX_RECORDING_MS,
						Math.round(performance.now() - startedAtRef.current),
					);
					cleanupStreams();
					if (cancelledRef.current) return;
					const blob = new Blob(chunksRef.current, {
						type: mime.split(";")[0],
					});
					if (blob.size === 0) {
						setError("Nothing was recorded. Try again.");
						setPhase("error");
						returnToTicketForm();
						return;
					}
					if (blob.size > MAX_RECORDING_BYTES) {
						setError("Recording is over 10 MB. Record a shorter clip.");
						setPhase("error");
						returnToTicketForm();
						return;
					}
					setDraftRecording((prev) => {
						if (prev) URL.revokeObjectURL(prev.url);
						return {
							blob,
							url: URL.createObjectURL(blob),
							mime: blob.type,
							bytes: blob.size,
							durationMs,
							hasAudio: hasAudioRef.current,
						};
					});
					setPhase("idle");
					setElapsedMs(0);
					returnToTicketForm();
				};
				recorderRef.current = rec;

				startedAtRef.current = performance.now();
				rec.start(1000);
				startedRef.current = true;
				setElapsedMs(0);
				setMicOn(hasAudioRef.current);
				setPhase("recording");
				timerRef.current = window.setInterval(() => {
					const ms = performance.now() - startedAtRef.current;
					setElapsedMs(ms);
					if (ms >= MAX_RECORDING_MS) stopRecording();
				}, 100);
			} catch (e) {
				cleanupStreams();
				const { text, idle } = recorderErrorMessage(e);
				setError(text);
				setPhase(idle ? "idle" : "error");
				returnToTicketForm();
			}
		},
		[cancelRecording, cleanupStreams, returnToTicketForm, stopRecording],
	);

	beginCaptureRef.current = beginCapture;

	const startRecording = useCallback(
		async (input: {
			problemPageUrl: string;
			withMic: boolean;
			onBeforeNavigate?: () => void;
		}) => {
			const parsed = parseProblemPageUrl(input.problemPageUrl);
			if (!parsed.ok) {
				setError(parsed.reason);
				setPhase("error");
				return;
			}

			if (pathname !== parsed.path) {
				savePendingScreenRecord({
					problemPageUrl: parsed.href,
					path: parsed.path,
					withMic: input.withMic,
				});
				input.onBeforeNavigate?.();
				router.push(parsed.path);
				return;
			}

			await beginCapture(input.withMic, true);
		},
		[beginCapture, pathname, router],
	);

	useEffect(() => {
		const pending = consumePendingScreenRecord(pathname);
		if (!pending) return;
		const id = window.setTimeout(() => {
			void beginCaptureRef.current?.(pending.withMic, true);
		}, 450);
		return () => window.clearTimeout(id);
	}, [pathname]);

	useEffect(
		() => () => {
			cancelledRef.current = true;
			stopRecording();
			cleanupStreams();
		},
		[cleanupStreams, stopRecording],
	);

	const setDraftRecordingSafe = useCallback((r: TicketRecording | null) => {
		setDraftRecording((prev) => {
			if (prev?.url) URL.revokeObjectURL(prev.url);
			return r;
		});
	}, []);

	const value = useMemo(
		(): TicketRecordingContextValue => ({
			draftRecording,
			setDraftRecording: setDraftRecordingSafe,
			phase,
			elapsedMs,
			error,
			micOn,
			isRecording: phase === "recording",
			clearError: () => {
				setError(null);
				if (phase === "error") setPhase("idle");
			},
			startRecording,
			stopRecording,
		}),
		[
			draftRecording,
			elapsedMs,
			error,
			micOn,
			phase,
			setDraftRecordingSafe,
			startRecording,
			stopRecording,
		],
	);

	return (
		<TicketRecordingContext.Provider value={value}>
			{children}
		</TicketRecordingContext.Provider>
	);
}

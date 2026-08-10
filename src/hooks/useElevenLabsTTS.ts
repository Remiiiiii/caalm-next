import { useCallback, useEffect, useRef, useState } from "react";

interface UseElevenLabsTTSOptions {
	autoPlay?: boolean;
	voiceId?: string;
	/** Fires when audio finishes naturally (not pause/stop). */
	onPlaybackEnd?: () => void;
}

interface UseElevenLabsTTSReturn {
	generateSpeech: (text: string) => Promise<void>;
	play: () => Promise<void>;
	pause: () => void;
	stop: () => void;
	isPlaying: boolean;
	isLoading: boolean;
	error: string | null;
}

/**
 * Custom hook for ElevenLabs text-to-speech functionality
 * Manages audio generation, playback, and cleanup
 */
export function useElevenLabsTTS(
	options: UseElevenLabsTTSOptions = {},
): UseElevenLabsTTSReturn {
	// Default: Rachel (ElevenLabs Default voice). Library voices require a paid plan via API.
	const {
		autoPlay = false,
		voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ||
			"21m00Tcm4TlvDq8ikWAM",
		onPlaybackEnd,
	} = options;
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const audioUrlRef = useRef<string | null>(null);
	const generationRef = useRef(0);
	const abortControllerRef = useRef<AbortController | null>(null);
	const onPlaybackEndRef = useRef(onPlaybackEnd);
	onPlaybackEndRef.current = onPlaybackEnd;
	const eventHandlersRef = useRef<{
		handlePlay?: () => void;
		handlePause?: () => void;
		handleEnded?: () => void;
		handleError?: (e: Event) => void;
	}>({});

	const cleanup = useCallback((options?: { invalidateInFlight?: boolean }) => {
		if (options?.invalidateInFlight) {
			generationRef.current += 1;
			abortControllerRef.current?.abort();
			abortControllerRef.current = null;
		}

		if (audioRef.current) {
			const handlers = eventHandlersRef.current;
			if (handlers.handlePlay) {
				audioRef.current.removeEventListener("play", handlers.handlePlay);
			}
			if (handlers.handlePause) {
				audioRef.current.removeEventListener("pause", handlers.handlePause);
			}
			if (handlers.handleEnded) {
				audioRef.current.removeEventListener("ended", handlers.handleEnded);
			}
			if (handlers.handleError) {
				audioRef.current.removeEventListener("error", handlers.handleError);
			}
			audioRef.current.pause();
			audioRef.current.src = "";
			audioRef.current = null;
			eventHandlersRef.current = {};
		}
		if (audioUrlRef.current) {
			URL.revokeObjectURL(audioUrlRef.current);
			audioUrlRef.current = null;
		}
		setIsPlaying(false);
	}, []);

	const generateSpeech = useCallback(
		async (text: string) => {
			const generation = ++generationRef.current;
			abortControllerRef.current?.abort();
			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			setIsLoading(true);
			setError(null);

			// Cleanup previous audio without bumping generation again
			cleanup();

			try {
				const response = await fetch("/api/elevenlabs/tts", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text, voice_id: voiceId }),
					signal: abortController.signal,
				});

				if (generation !== generationRef.current) {
					return;
				}

				if (!response.ok) {
					let errorText = "";
					try {
						errorText = await response.text();
					} catch (_textError) {
						errorText = "Failed to read error response";
					}

					const errorInfo: {
						status: number;
						statusText: string;
						responseBody: string;
						parsedError?: Record<string, unknown>;
					} = {
						status: response.status,
						statusText: response.statusText,
						responseBody: errorText || "(empty response body)",
					};

					if (errorText?.trim()) {
						try {
							const parsed = JSON.parse(errorText);
							if (parsed && typeof parsed === "object") {
								errorInfo.parsedError = parsed;
							}
						} catch {
							// Not JSON
						}
					}

					let errorMessage = "Failed to generate speech";
					if (errorInfo.parsedError) {
						const parsed = errorInfo.parsedError;
						const detail = parsed.detail as
							| { message?: string; code?: string }
							| string
							| undefined;
						const detailMessage =
							typeof detail === "object" && detail?.message
								? detail.message
								: typeof detail === "string"
									? detail
									: undefined;
						errorMessage =
							detailMessage ||
							(parsed.error as string) ||
							(parsed.message as string) ||
							(parsed.details as string) ||
							errorMessage;

						if (
							typeof detail === "object" &&
							detail?.code === "paid_plan_required"
						) {
							errorMessage =
								"ElevenLabs Free plan cannot use Voice Library voices via the API. Use a Default voice ID (NEXT_PUBLIC_ELEVENLABS_VOICE_ID) or upgrade to Starter.";
						}
					}

					if (errorMessage === "Failed to generate speech" && errorText) {
						errorMessage = errorText;
					}

					if (errorMessage === "Failed to generate speech") {
						errorMessage = `HTTP ${response.status}: ${response.statusText}`;
					}

					console.error("TTS API error:", errorInfo);

					throw new Error(errorMessage);
				}

				const audioBlob = await response.blob();

				if (generation !== generationRef.current) {
					return;
				}

				if (!audioBlob || audioBlob.size === 0) {
					throw new Error("Received empty audio blob");
				}

				const audioUrl = URL.createObjectURL(audioBlob);

				if (generation !== generationRef.current) {
					URL.revokeObjectURL(audioUrl);
					return;
				}

				audioUrlRef.current = audioUrl;

				const audio = new Audio(audioUrl);
				audio.preload = "auto";
				audioRef.current = audio;

				const handlePlay = () => setIsPlaying(true);
				const handlePause = () => setIsPlaying(false);
				const handleEnded = () => {
					setIsPlaying(false);
					onPlaybackEndRef.current?.();
					cleanup();
				};
				const handleError = (e: Event) => {
					if (generation !== generationRef.current) return;

					const audioElement = audioRef.current;
					let errorMessage = "Audio playback error";

					if (audioElement?.error) {
						const mediaError = audioElement.error;
						switch (mediaError.code) {
							case MediaError.MEDIA_ERR_ABORTED:
								errorMessage = "Audio loading aborted";
								break;
							case MediaError.MEDIA_ERR_NETWORK:
								errorMessage = "Network error loading audio";
								break;
							case MediaError.MEDIA_ERR_DECODE:
								errorMessage = "Audio decode error";
								break;
							case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
								errorMessage = "Audio format not supported";
								break;
							default:
								errorMessage = `Audio error (code: ${mediaError.code})`;
						}
					}

					console.error("Audio playback error:", {
						message: errorMessage,
						code: audioElement?.error?.code,
						event: e,
					});

					setError(errorMessage);
					setIsPlaying(false);
					setIsLoading(false);
					cleanup();
				};

				eventHandlersRef.current = {
					handlePlay,
					handlePause,
					handleEnded,
					handleError,
				};

				audio.addEventListener("play", handlePlay);
				audio.addEventListener("pause", handlePause);
				audio.addEventListener("ended", handleEnded);
				audio.addEventListener("error", handleError);

				audio.load();

				if (autoPlay) {
					try {
						const playPromise = audio.play();
						if (playPromise !== undefined) {
							await playPromise;
						}
						if (generation !== generationRef.current) {
							cleanup();
							return;
						}
					} catch (playError) {
						if (generation !== generationRef.current) {
							return;
						}
						console.warn("Autoplay was blocked:", playError);
						setError("Autoplay blocked. Click play to hear audio.");
					}
				}

				if (generation === generationRef.current) {
					setIsLoading(false);
				}
			} catch (err) {
				if (generation !== generationRef.current) {
					return;
				}
				if (err instanceof DOMException && err.name === "AbortError") {
					setIsLoading(false);
					return;
				}
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				setError(errorMessage);
				setIsLoading(false);
				console.error("TTS generation error:", err);
			}
		},
		[autoPlay, voiceId, cleanup],
	);

	const play = useCallback(async () => {
		if (audioRef.current && audioUrlRef.current) {
			try {
				await audioRef.current.play();
			} catch (err) {
				console.error("Play error:", err);
				setError("Failed to play audio");
			}
		}
	}, []);

	const pause = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
		}
	}, []);

	const stop = useCallback(() => {
		cleanup({ invalidateInFlight: true });
		setIsLoading(false);
	}, [cleanup]);

	useEffect(() => {
		return () => {
			cleanup({ invalidateInFlight: true });
		};
	}, [cleanup]);

	return {
		generateSpeech,
		play,
		pause,
		stop,
		isPlaying,
		isLoading,
		error,
	};
}

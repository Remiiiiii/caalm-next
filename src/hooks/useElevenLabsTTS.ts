import { useCallback, useEffect, useRef, useState } from "react";

interface UseElevenLabsTTSOptions {
	autoPlay?: boolean;
	voiceId?: string;
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
	const { autoPlay = false, voiceId = "K8RBkZM3VaxoGBaGvie0" } = options;
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const audioUrlRef = useRef<string | null>(null);
	const eventHandlersRef = useRef<{
		handlePlay?: () => void;
		handlePause?: () => void;
		handleEnded?: () => void;
		handleError?: (e: Event) => void;
	}>({});

	const cleanup = useCallback(() => {
		if (audioRef.current) {
			// Remove all event listeners before cleanup
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
			setIsLoading(true);
			setError(null);

			// Cleanup previous audio
			cleanup();

			try {
				const response = await fetch("/api/elevenlabs/tts", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text, voice_id: voiceId }),
				});

				if (!response.ok) {
					let errorText = "";
					try {
						errorText = await response.text();
					} catch (_textError) {
						errorText = "Failed to read error response";
					}

					// Build error information object with guaranteed fields
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

					// Try to parse JSON error response
					if (errorText?.trim()) {
						try {
							const parsed = JSON.parse(errorText);
							if (parsed && typeof parsed === "object") {
								errorInfo.parsedError = parsed;
							}
						} catch {
							// Not JSON, that's fine - we have the raw text
						}
					}

					// Extract error message from parsed error or use defaults
					let errorMessage = "Failed to generate speech";
					if (errorInfo.parsedError) {
						errorMessage =
							(errorInfo.parsedError.error as string) ||
							(errorInfo.parsedError.message as string) ||
							(errorInfo.parsedError.details as string) ||
							errorMessage;
					}

					// Fallback to HTTP status if no message found
					if (errorMessage === "Failed to generate speech" && errorText) {
						errorMessage = errorText;
					}

					// Final fallback to HTTP status
					if (errorMessage === "Failed to generate speech") {
						errorMessage = `HTTP ${response.status}: ${response.statusText}`;
					}

					console.error("TTS API error:", errorInfo);

					throw new Error(errorMessage);
				}

				// Get blob immediately without extensive validation (faster)
				const audioBlob = await response.blob();

				// Quick validation only
				if (!audioBlob || audioBlob.size === 0) {
					throw new Error("Received empty audio blob");
				}

				const audioUrl = URL.createObjectURL(audioBlob);
				audioUrlRef.current = audioUrl;

				// Create new audio element with preload for faster playback
				const audio = new Audio(audioUrl);
				audio.preload = "auto"; // Preload audio for faster playback
				audioRef.current = audio;

				// Set up event listeners (store references for cleanup)
				const handlePlay = () => setIsPlaying(true);
				const handlePause = () => setIsPlaying(false);
				const handleEnded = () => {
					setIsPlaying(false);
					cleanup();
				};
				const handleError = (e: Event) => {
					const audioElement = audioRef.current;
					let errorMessage = "Audio playback error";

					if (audioElement?.error) {
						const error = audioElement.error;
						switch (error.code) {
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
								errorMessage = `Audio error (code: ${error.code})`;
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

				// Store handlers for cleanup
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

				// Start loading audio immediately (don't wait for full load)
				audio.load();

				if (autoPlay) {
					try {
						// Try to play immediately - browser will buffer if needed
						const playPromise = audio.play();
						if (playPromise !== undefined) {
							await playPromise;
						}
					} catch (playError) {
						// Browser autoplay policy may block this
						console.warn("Autoplay was blocked:", playError);
						setError("Autoplay blocked. Click play to hear audio.");
					}
				}

				setIsLoading(false);
			} catch (err) {
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
		cleanup();
	}, [cleanup]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cleanup();
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

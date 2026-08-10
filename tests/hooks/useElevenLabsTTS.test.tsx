import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";

describe("useElevenLabsTTS single-flight", () => {
	const playSpies: Array<ReturnType<typeof vi.fn>> = [];
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		playSpies.length = 0;

		class FakeAudio {
			preload = "";
			src = "";
			error = null;
			play = vi.fn().mockResolvedValue(undefined);
			pause = vi.fn();
			load = vi.fn();
			addEventListener = vi.fn();
			removeEventListener = vi.fn();

			constructor(src?: string) {
				if (src) this.src = src;
				playSpies.push(this.play);
			}
		}

		vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
		vi.stubGlobal("URL", {
			...URL,
			createObjectURL: vi.fn(() => "blob:mock-audio"),
			revokeObjectURL: vi.fn(),
		});

		fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	function delayedOkResponse(delayMs: number) {
		return new Promise<Response>((resolve) => {
			setTimeout(() => {
				resolve(
					new Response(new Blob(["audio"], { type: "audio/mpeg" }), {
						status: 200,
						statusText: "OK",
					}),
				);
			}, delayMs);
		});
	}

	it("only plays audio from the latest generateSpeech when calls overlap", async () => {
		fetchMock
			.mockImplementationOnce(() => delayedOkResponse(40))
			.mockImplementationOnce(() => delayedOkResponse(10));

		const { result } = renderHook(() =>
			useElevenLabsTTS({ autoPlay: true }),
		);

		await act(async () => {
			void result.current.generateSpeech("first clip");
			void result.current.generateSpeech("second clip");
		});

		await waitFor(() => {
			expect(playSpies.length).toBeGreaterThanOrEqual(1);
			expect(playSpies.at(-1)).toHaveBeenCalledTimes(1);
		});

		// Give the slower first request time to finish; it must not play.
		await act(async () => {
			await new Promise((r) => setTimeout(r, 60));
		});

		const totalPlays = playSpies.reduce(
			(sum, spy) => sum + spy.mock.calls.length,
			0,
		);
		expect(totalPlays).toBe(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("stop() prevents an in-flight generateSpeech from playing", async () => {
		fetchMock.mockImplementationOnce(() => delayedOkResponse(40));

		const { result } = renderHook(() =>
			useElevenLabsTTS({ autoPlay: true }),
		);

		await act(async () => {
			void result.current.generateSpeech("clip");
			result.current.stop();
		});

		await act(async () => {
			await new Promise((r) => setTimeout(r, 60));
		});

		const totalPlays = playSpies.reduce(
			(sum, spy) => sum + spy.mock.calls.length,
			0,
		);
		expect(totalPlays).toBe(0);
		expect(result.current.isLoading).toBe(false);
	});

	it("calls onPlaybackEnd when audio ends naturally", async () => {
		const onPlaybackEnd = vi.fn();
		let endedHandler: (() => void) | undefined;

		class FakeAudioWithEnded {
			preload = "";
			src = "";
			error = null;
			play = vi.fn().mockResolvedValue(undefined);
			pause = vi.fn();
			load = vi.fn();
			addEventListener = vi.fn((event: string, handler: () => void) => {
				if (event === "ended") endedHandler = handler;
			});
			removeEventListener = vi.fn();

			constructor(src?: string) {
				if (src) this.src = src;
				playSpies.push(this.play);
			}
		}

		vi.stubGlobal("Audio", FakeAudioWithEnded as unknown as typeof Audio);
		fetchMock.mockResolvedValueOnce(
			new Response(new Blob(["audio"], { type: "audio/mpeg" }), {
				status: 200,
				statusText: "OK",
			}),
		);

		const { result } = renderHook(() =>
			useElevenLabsTTS({ autoPlay: true, onPlaybackEnd }),
		);

		await act(async () => {
			await result.current.generateSpeech("clip");
		});

		expect(endedHandler).toBeTypeOf("function");

		await act(async () => {
			endedHandler?.();
		});

		expect(onPlaybackEnd).toHaveBeenCalledTimes(1);
	});
});

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExpiryCarousel from "@/components/contract-expiry-modal/ExpiryCarousel";
import type { ExpiryNarration } from "@/components/expiry-alert-modal/expiry-alert-types";
import type { ExpiryQueueItem } from "@/lib/expiry/expiry-queue";
import type { UIFileDoc } from "@/types/files";

const tts = vi.hoisted(() => ({
	generateSpeech: vi.fn().mockResolvedValue(undefined),
	stop: vi.fn(),
	onPlaybackEnd: undefined as undefined | (() => void),
}));

const suppressContractAlarm = vi.fn();

vi.mock("@/lib/sounds/contractAlarm", () => ({
	suppressContractAlarm: (...args: unknown[]) => suppressContractAlarm(...args),
}));

vi.mock("@/hooks/useElevenLabsTTS", () => ({
	useElevenLabsTTS: (opts?: { onPlaybackEnd?: () => void }) => {
		tts.onPlaybackEnd = opts?.onPlaybackEnd;
		return {
			generateSpeech: tts.generateSpeech,
			play: vi.fn(),
			pause: vi.fn(),
			stop: tts.stop,
			isPlaying: true,
			isLoading: false,
			error: null,
		};
	},
}));

vi.mock("@/contexts/AuthContext", () => ({
	useAuth: () => ({ user: { name: "Alex" } }),
}));

// Mock the bridge: surface narration controls + an item-handled trigger so we
// can exercise the carousel's wiring without the full modal.
vi.mock("@/components/expiry-alert-modal/ExpiryQueueAlertBridge", () => ({
	default: ({
		onItemHandled,
		item,
		narration,
	}: {
		onItemHandled: (item: ExpiryQueueItem) => void;
		item: ExpiryQueueItem;
		narration: ExpiryNarration | null;
	}) => (
		<div>
			<span data-testid="current-item">{item.id}</span>
			{narration && (
				<>
					<button type="button" onClick={narration.onToggleMute}>
						{narration.muted ? "Unmute narration" : "Mute narration"}
					</button>
					<button type="button" onClick={narration.onStayHere}>
						Stay here
					</button>
					{narration.paused && <span>Auto-advance paused</span>}
					{narration.countdownSeconds !== null && (
						<span>Next item in {narration.countdownSeconds}s</span>
					)}
				</>
			)}
			<button type="button" onClick={() => onItemHandled(item)}>
				Let Expire
			</button>
		</div>
	),
}));

function makeItem(id: string, name: string): ExpiryQueueItem {
	return {
		kind: "contract",
		id,
		days: 4,
		file: {
			$id: id,
			contractName: name,
			contractExpiryDate: "2026-09-01",
			status: "active",
			name,
		} as UIFileDoc,
	};
}

describe("ExpiryCarousel alarm + mute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tts.generateSpeech.mockResolvedValue(undefined);
		tts.onPlaybackEnd = undefined;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("suppresses the looping dashboard bell when the overlay mounts", () => {
		render(
			<ExpiryCarousel
				items={[makeItem("c1", "First"), makeItem("c2", "Second")]}
				onDismiss={vi.fn()}
				onItemDismissed={vi.fn()}
			/>,
		);
		expect(suppressContractAlarm).toHaveBeenCalled();
	});

	it("lets the user mute without waiting for TTS to finish loading", async () => {
		const user = userEvent.setup();
		render(
			<ExpiryCarousel
				items={[makeItem("c1", "First"), makeItem("c2", "Second")]}
				onDismiss={vi.fn()}
				onItemDismissed={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Mute narration" }));
		expect(tts.stop).toHaveBeenCalled();
		expect(suppressContractAlarm).toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Unmute narration" }),
		).toBeInTheDocument();
	});

	it("suppresses the bell again when Let Expire advances the queue", async () => {
		const user = userEvent.setup();
		const onItemDismissed = vi.fn();
		render(
			<ExpiryCarousel
				items={[makeItem("c1", "First"), makeItem("c2", "Second")]}
				onDismiss={vi.fn()}
				onItemDismissed={onItemDismissed}
			/>,
		);

		suppressContractAlarm.mockClear();
		await user.click(screen.getByRole("button", { name: "Let Expire" }));
		expect(onItemDismissed).toHaveBeenCalled();
		expect(suppressContractAlarm).toHaveBeenCalled();
		expect(tts.stop).toHaveBeenCalled();
	});

	it("shows a countdown after speech ends and Stay here pauses it", () => {
		vi.useFakeTimers();
		render(
			<ExpiryCarousel
				items={[makeItem("c1", "First"), makeItem("c2", "Second")]}
				onDismiss={vi.fn()}
				onItemDismissed={vi.fn()}
			/>,
		);

		act(() => {
			tts.onPlaybackEnd?.();
		});
		expect(screen.getByText(/next item in 6s/i)).toBeInTheDocument();

		act(() => {
			screen.getByRole("button", { name: "Stay here" }).click();
		});
		expect(screen.getByText(/auto-advance paused/i)).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(8_000);
		});
		expect(screen.getByTestId("current-item")).toHaveTextContent("c1");
		vi.useRealTimers();
	});

	it("does not auto-advance when narration is muted", () => {
		vi.useFakeTimers();
		render(
			<ExpiryCarousel
				items={[makeItem("c1", "First"), makeItem("c2", "Second")]}
				onDismiss={vi.fn()}
				onItemDismissed={vi.fn()}
			/>,
		);
		act(() => {
			screen.getByRole("button", { name: "Mute narration" }).click();
		});
		act(() => {
			tts.onPlaybackEnd?.();
			vi.advanceTimersByTime(8_000);
		});
		expect(screen.getByTestId("current-item")).toHaveTextContent("c1");
		expect(screen.queryByText(/next item in/i)).not.toBeInTheDocument();
		vi.useRealTimers();
	});
});
